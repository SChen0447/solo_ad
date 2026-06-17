/**
 * 主程序入口 - main.ts
 *
 * 职责：
 * - 初始化 Three.js 核心（Scene、PerspectiveCamera、WebGLRenderer）
 * - 创建并协调 Atmosphere、Visualizer、UIController 三大模块
 * - 管理模块间的数据流与状态同步
 * - 处理交互事件回调并驱动状态更新
 * - 实现时间快照渐变过渡动画（500ms tween）
 * - 启动渲染循环，保证 45FPS+ 性能
 *
 * 模块间数据流总图：
 *
 *   ┌──────────────┐   axios GET    ┌────────────────┐
 *   │  Atmosphere  │◄───────────────│  backend/app   │
 *   │  (数据模型)  │                │   Flask 5000   │
 *   └──────┬───────┘                └────────────────┘
 *          │ getSlice()
 *          │ getInterpolatedSlice()
 *          ▼
 *   ┌──────────────┐   renderSlice()   ┌────────────┐
 *   │  Visualizer  │──────────────────►│  THREE.Scene│
 *   │  (3D渲染)    │                   │  Renderer   │
 *   └──────┬───────┘                   └──────┬─────┘
 *          │                                   │ render()
 *   update()│ animate()                       ▼
 *          │                           ┌──────────────┐
 *   ┌──────┴───────┐                   │  <canvas>    │
 *   │ main.ts Loop │◄──────────────────│  DOM 元素    │
 *   │  (事件中枢)  │    事件回调        │  控件UI      │
 *   └──────┬───────┘                   └──────┬─────┘
 *          │                                   │
 *          │ onAltitudeChange()                │
 *          │ onTimestampChange()               │
 *          │ onPlayPause()                     │
 *          ▼                                   │
 *   ┌──────────────┐   OrbitControls + 事件    │
 *   │ UIController │───────────────────────────┘
 *   │ (交互控制)   │
 *   └──────────────┘
 *
 * 启动方式：
 *   后端:  cd backend && python app.py    (端口5000)
 *   前端:  npm run dev                    (端口3000)
 */

import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

import { Atmosphere, type SliceData } from './atmosphere';
import { Visualizer } from './visualizer';
import { UIController } from './controls';

// ============ 全局状态 ============

const DEBUG_FPS = false;

class App {
  // Three.js 核心对象
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvasContainer: HTMLElement;

  // 三大模块
  private atmosphere: Atmosphere;
  private visualizer: Visualizer | null = null;
  private ui: UIController | null = null;

  // 动画状态
  private clock: THREE.Clock;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsAccumulator: number = 0;

  // 过渡动画状态
  private isTransitioning: boolean = false;
  private targetSnapshotIndex: number = 0;

  // 性能监控
  private currentFps: number = 60;

  constructor() {
    // ---- 初始化基础 DOM & Three.js ----
    this.canvasContainer = document.getElementById('canvas-container')!;

    this.scene = this._createScene();
    this.camera = this._createCamera();
    this.renderer = this._createRenderer();

    this.canvasContainer.appendChild(this.renderer.domElement);

    // ---- 处理窗口 resize ----
    this._handleResize();
    window.addEventListener('resize', this._handleResize.bind(this));

    // ---- 初始化模块 ----
    this.atmosphere = new Atmosphere();
    this.clock = new THREE.Clock();

    // ---- 添加环境光与点缀 ----
    this._setupLightsAndBackground();

    // ---- 启动初始化流程 ----
    this._init().catch((err) => {
      console.error('[App] 初始化失败:', err);
      this._showError(err.message || '未知错误');
    });
  }

  // ============ Three.js 初始化 ============

  private _createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    // 深蓝-紫 渐变背景（使用 fog 模拟）
    scene.background = new THREE.Color(0x0a0a1f);
    scene.fog = new THREE.FogExp2(0x0a0a1f, 0.02);
    return scene;
  }

  private _createCamera(): THREE.PerspectiveCamera {
    const aspect = this.canvasContainer.clientWidth / this.canvasContainer.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    // 初始视角：斜向下 45 度
    camera.position.set(9, 7, 9);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private _createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(
      this.canvasContainer.clientWidth,
      this.canvasContainer.clientHeight
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    return renderer;
  }

  private _setupLightsAndBackground(): void {
    // 粒子星空背景
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 35 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);

    // 平行光（模拟太阳方向光）
    const dirLight = new THREE.DirectionalLight(0x88bbff, 0.6);
    dirLight.position.set(10, 15, 8);
    this.scene.add(dirLight);

    // 环境光
    const ambLight = new THREE.AmbientLight(0x3344aa, 0.5);
    this.scene.add(ambLight);
  }

  // ============ 异步初始化 ============

  private async _init(): Promise<void> {
    // Step 1: 加载气象数据
    const loadOk = await this.atmosphere.fetchAllData();
    if (!loadOk) {
      throw new Error('气象数据加载失败');
    }

    // Step 2: 创建渲染器和控制器
    this.visualizer = new Visualizer(
      this.scene,
      this.atmosphere.getAltitudes().length
    );

    this.ui = new UIController(
      this.renderer.domElement,
      this.camera,
      this.renderer,
      {
        onAltitudeChange: this._onAltitudeChange.bind(this),
        onTimestampChange: this._onTimestampChange.bind(this),
        onPlayPause: this._onPlayPause.bind(this),
        onReset: this._onReset.bind(this)
      },
      {
        altitudes: this.atmosphere.getAltitudes(),
        totalTimestamps: this.atmosphere.getNumTimestamps(),
        initialAltitudeIndex: 2
      }
    );

    // Step 3: 初始渲染（默认 5000m，第0个时间快照）
    const initialSlice = this.atmosphere.getSlice(2, 0);
    this.visualizer.renderSlice(initialSlice, false);
    this._updateUIInfo(initialSlice);

    // Step 4: 隐藏 Loading 遮罩
    this.ui.hideLoading();

    // Step 5: 启动渲染循环
    requestAnimationFrame(this._animate.bind(this));

    console.log('[App] 初始化完成！');
    console.log(`[App] 网格尺寸: ${this.atmosphere.getGridSize()}`);
    console.log(`[App] 海拔层: ${this.atmosphere.getAltitudes().join(', ')}m`);
    console.log(`[App] 时间快照数: ${this.atmosphere.getNumTimestamps()}`);
  }

  // ============ 交互事件回调 ============

  /**
   * 海拔滑块变化：立即更新切片（200ms 内部过渡）
   */
  private _onAltitudeChange(altitudeIndex: number): void {
    if (!this.visualizer || !this.ui) return;

    this.atmosphere.setCurrentAltitude(altitudeIndex);

    // 海拔切换时使用当前时间快照
    const snapIdx = this.atmosphere.getCurrentSnapshotIndex();
    const slice = this.isTransitioning
      ? this.atmosphere.getInterpolatedSlice(
          this.targetSnapshotIndex,
          this._getTransitionProgress(),
          altitudeIndex
        )
      : this.atmosphere.getSlice(altitudeIndex, snapIdx);

    this.visualizer.renderSlice(slice, true);
    this._updateUIInfo(slice);
  }

  /**
   * 时间快照切换：启动 500ms 渐变过渡动画
   */
  private _onTimestampChange(snapshotIndex: number, animate: boolean): void {
    if (!this.visualizer || !this.ui) return;
    if (snapshotIndex === this.atmosphere.getCurrentSnapshotIndex() && !this.isTransitioning) {
      return;
    }

    this.targetSnapshotIndex = snapshotIndex;

    if (!animate) {
      // 无动画直接切换
      this._completeTimestampTransition(snapshotIndex);
      return;
    }

    // 启动 500ms tween 过渡动画
    this._startTimestampTransition(snapshotIndex);
  }

  private _onPlayPause(isPlaying: boolean): void {
    console.log(`[App] ${isPlaying ? '开始播放' : '暂停播放'}`);
  }

  private _onReset(): void {
    // 停止正在进行的过渡
    if (this.isTransitioning) {
      TWEEN.removeAll();
      this.isTransitioning = false;
    }
    console.log('[App] 已重置');
  }

  // ============ 时间快照过渡动画（500ms） ============

  private transitionStartTime: number = 0;
  private TRANSITION_DURATION = 500;

  private _startTimestampTransition(targetIdx: number): void {
    if (this.isTransitioning) {
      // 取消现有过渡
      TWEEN.removeAll();
    }

    this.isTransitioning = true;
    this.transitionStartTime = performance.now();

    const transitionState = { t: 0 };

    new TWEEN.Tween(transitionState)
      .to({ t: 1 }, this.TRANSITION_DURATION)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this._updateTransition(transitionState.t, targetIdx);
      })
      .onComplete(() => {
        this._completeTimestampTransition(targetIdx);
      })
      .start();
  }

  private _getTransitionProgress(): number {
    if (!this.isTransitioning) return 1;
    const elapsed = performance.now() - this.transitionStartTime;
    return Math.min(1, elapsed / this.TRANSITION_DURATION);
  }

  private _updateTransition(progress: number, targetIdx: number): void {
    if (!this.visualizer || !this.ui) return;

    const altitudeIdx = this.atmosphere.getCurrentAltitudeIndex();
    const slice = this.atmosphere.getInterpolatedSlice(targetIdx, progress, altitudeIdx);

    this.visualizer.renderSlice(slice, true);
    this._updateUIInfo(slice);
  }

  private _completeTimestampTransition(targetIdx: number): void {
    if (!this.visualizer || !this.ui) return;

    this.isTransitioning = false;
    this.atmosphere.setCurrentSnapshot(targetIdx);

    const altitudeIdx = this.atmosphere.getCurrentAltitudeIndex();
    const finalSlice = this.atmosphere.getSlice(altitudeIdx, targetIdx);
    this.visualizer.renderSlice(finalSlice, true);
    this._updateUIInfo(finalSlice);

    // 更新 UI 时间标签
    this.ui.updateCurrentTimeLabel(this.atmosphere.getCurrentTimestamp());
  }

  // ============ UI 信息同步 ============

  private _updateUIInfo(slice: SliceData): void {
    if (!this.ui) return;
    this.ui.updateAvgTemp(slice.stats.temp_mean);
  }

  // ============ 渲染循环 ============

  private _animate(): void {
    requestAnimationFrame(this._animate.bind(this));

    const delta = this.clock.getDelta();

    // Tween 更新（过渡动画）
    TWEEN.update();

    // UI / OrbitControls 更新
    if (this.ui) {
      this.ui.update(delta);
    }

    // Visualizer 微动画（箭头脉冲等）
    if (this.visualizer) {
      this.visualizer.update(delta);
    }

    // 渲染
    this.renderer.render(this.scene, this.camera);

    // FPS 统计
    if (DEBUG_FPS) {
      this._measureFPS();
    }
  }

  private _measureFPS(): void {
    const now = performance.now();
    this.frameCount++;
    this.fpsAccumulator += now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.fpsAccumulator >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / this.fpsAccumulator);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
      console.log(`[FPS] ${this.currentFps}`);
    }
  }

  // ============ 辅助方法 ============

  private _handleResize(): void {
    const w = this.canvasContainer.clientWidth;
    const h = this.canvasContainer.clientHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private _showError(message: string): void {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.innerHTML = `
        <div style="color:#ff6b6b;font-size:16px;text-align:center;max-width:400px;">
          <div style="font-size:32px;margin-bottom:16px;">⚠️</div>
          <div style="font-weight:600;margin-bottom:8px;">初始化失败</div>
          <div style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.6;">
            ${message}
            <br /><br />
            <span style="color:#64d8ff;">提示：请确保后端服务已启动</span><br />
            <code style="background:rgba(0,0,0,0.3);padding:4px 8px;border-radius:4px;">
              cd backend && pip install flask flask-cors numpy && python app.py
            </code>
          </div>
        </div>
      `;
    }
  }
}

// ============ 启动应用 ============

window.addEventListener('DOMContentLoaded', () => {
  console.log('='.repeat(60));
  console.log('  3D 大气层切片可视化应用');
  console.log('  Atmosphere 3D Slice Visualizer v1.0.0');
  console.log('='.repeat(60));
  console.log();
  new App();
});
