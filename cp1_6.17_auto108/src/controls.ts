/**
 * 交互控制模块 - UIController
 *
 * 职责：
 * - Three.js OrbitControls：鼠标拖拽旋转、滚轮缩放场景
 * - 海拔高度滑块：控制切割平面的移动
 * - 时间轴播放：播放/暂停按钮、进度条、自动切换（每2秒切换）
 * - 时间戳列表点击：直接跳到指定快照
 * - UI 信息更新：显示当前海拔、时间、平均温度
 *
 * 数据流向：
 *   用户交互 -> UIController -> 回调事件 -> main.ts -> Atmosphere + Visualizer
 *
 * 调用关系：
 *   main.ts 创建 UIController 实例
 *   main.ts 在动画循环中调用 UIController.update(delta)
 *   UIController 通过回调函数通知 main.ts 状态变化
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============ 回调接口 ============

export interface ControlCallbacks {
  onAltitudeChange: (altitudeIndex: number) => void;
  onTimestampChange: (snapshotIndex: number, animate: boolean) => void;
  onPlayPause: (isPlaying: boolean) => void;
  onReset: () => void;
}

// ============ UI 控制器主类 ============

export class UIController {
  // Three.js 相机控制
  private orbitControls: OrbitControls;

  // DOM 元素
  private altitudeSlider: HTMLInputElement;
  private progressSlider: HTMLInputElement;
  private playPauseBtn: HTMLButtonElement;
  private playIconSpan: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;
  private timestampList: HTMLElement;
  private loadingOverlay: HTMLElement;

  // UI 显示元素
  private altitudeValueEl: HTMLElement;
  private currentTimeEl: HTMLElement;
  private avgTempEl: HTMLElement;

  // 状态
  private callbacks: ControlCallbacks;
  private isPlaying: boolean = false;
  private playInterval: number | null = null;
  private currentAltitudeIndex: number = 2;
  private currentTimestampIndex: number = 0;

  // 配置
  private readonly altitudes: number[];
  private readonly totalTimestamps: number;
  private readonly SWITCH_INTERVAL_MS: number = 2000;

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    callbacks: ControlCallbacks,
    options: {
      altitudes: number[];
      totalTimestamps: number;
      initialAltitudeIndex: number;
    }
  ) {
    this.callbacks = callbacks;
    this.altitudes = options.altitudes;
    this.totalTimestamps = options.totalTimestamps;
    this.currentAltitudeIndex = options.initialAltitudeIndex;

    // ---- 初始化 OrbitControls ----
    this.orbitControls = new OrbitControls(camera, renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.enablePan = false;
    this.orbitControls.minDistance = 2;
    this.orbitControls.maxDistance = 20;
    this.orbitControls.minPolarAngle = Math.PI * 0.15;
    this.orbitControls.maxPolarAngle = Math.PI * 0.75;
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.update();

    // ---- 获取 DOM 元素 ----
    this.altitudeSlider = document.getElementById('altitude-slider') as HTMLInputElement;
    this.progressSlider = document.getElementById('progress-slider') as HTMLInputElement;
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.playIconSpan = document.getElementById('play-icon') as HTMLSpanElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.timestampList = document.getElementById('timestamp-list') as HTMLElement;
    this.loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
    this.altitudeValueEl = document.getElementById('altitude-value') as HTMLElement;
    this.currentTimeEl = document.getElementById('current-time') as HTMLElement;
    this.avgTempEl = document.getElementById('avg-temp') as HTMLElement;

    // ---- 设置初始值 ----
    this.altitudeSlider.min = '0';
    this.altitudeSlider.max = String(this.altitudes.length - 1);
    this.altitudeSlider.step = '1';
    this.altitudeSlider.value = String(this.currentAltitudeIndex);

    this.progressSlider.min = '0';
    this.progressSlider.max = String(this.totalTimestamps - 1);
    this.progressSlider.step = '1';
    this.progressSlider.value = '0';

    // ---- 绑定事件 ----
    this._bindEvents();
    this._updateAltitudeDisplay();
    this._updateTimestampDisplay();
  }

  // ============ 事件绑定 ============

  private _bindEvents(): void {
    // 海拔滑块 - 鼠标事件（即时响应）
    let lastAltitudeEmit = 0;
    this.altitudeSlider.addEventListener('input', () => {
      const idx = parseInt(this.altitudeSlider.value, 10);
      this.currentAltitudeIndex = idx;
      this._updateAltitudeDisplay();

      // 节流：20ms 内最多触发一次（滑块拖动频繁）
      const now = performance.now();
      if (now - lastAltitudeEmit > 20) {
        lastAltitudeEmit = now;
        this.callbacks.onAltitudeChange(idx);
      }
    });

    this.altitudeSlider.addEventListener('change', () => {
      // 最终值确保触发（避免节流丢了最后一次）
      const idx = parseInt(this.altitudeSlider.value, 10);
      this.callbacks.onAltitudeChange(idx);
    });

    // 进度条（手动拖动）
    this.progressSlider.addEventListener('input', () => {
      const idx = parseInt(this.progressSlider.value, 10);
      if (idx !== this.currentTimestampIndex) {
        this._gotoTimestamp(idx, true);
      }
    });

    // 播放/暂停按钮
    this.playPauseBtn.addEventListener('click', () => {
      this.togglePlayPause();
    });

    // 重置按钮
    this.resetBtn.addEventListener('click', () => {
      this.reset();
    });

    // 时间戳列表项点击
    const items = this.timestampList.querySelectorAll('.timestamp-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const idxAttr = item.getAttribute('data-index');
        if (idxAttr !== null) {
          const idx = parseInt(idxAttr, 10);
          this._gotoTimestamp(idx, true);
        }
      });
    });

    // 键盘快捷键
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':  // 空格：播放/暂停
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'ArrowRight':  // 右箭头：下一帧
          e.preventDefault();
          if (!e.ctrlKey && !e.metaKey) {
            this.nextTimestamp();
          }
          break;
        case 'ArrowLeft':  // 左箭头：上一帧
          e.preventDefault();
          if (!e.ctrlKey && !e.metaKey) {
            this.prevTimestamp();
          }
          break;
        case 'ArrowUp':  // 上箭头：海拔上升
          e.preventDefault();
          this._setAltitudeIndex(this.currentAltitudeIndex + 1);
          break;
        case 'ArrowDown':  // 下箭头：海拔下降
          e.preventDefault();
          this._setAltitudeIndex(this.currentAltitudeIndex - 1);
          break;
        case 'r':
        case 'R':
          this.reset();
          break;
      }
    });
  }

  // ============ 播放控制 API ============

  togglePlayPause(): void {
    this.isPlaying ? this._pause() : this._play();
  }

  private _play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playIconSpan.textContent = '⏸ 暂停';

    // 循环播放定时器：每 2 秒切换
    this.playInterval = window.setInterval(() => {
      let nextIdx = this.currentTimestampIndex + 1;
      if (nextIdx >= this.totalTimestamps) {
        // 到末尾则回到开头
        nextIdx = 0;
      }
      this._gotoTimestamp(nextIdx, true);
    }, this.SWITCH_INTERVAL_MS);

    this.callbacks.onPlayPause(true);
  }

  private _pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.playIconSpan.textContent = '▶ 播放';

    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }

    this.callbacks.onPlayPause(false);
  }

  reset(): void {
    this._pause();
    this._gotoTimestamp(0, true);
    this._setAltitudeIndex(2); // 恢复到 5000m
    this.callbacks.onReset();
  }

  nextTimestamp(): void {
    const next = Math.min(this.totalTimestamps - 1, this.currentTimestampIndex + 1);
    this._gotoTimestamp(next, true);
  }

  prevTimestamp(): void {
    const prev = Math.max(0, this.currentTimestampIndex - 1);
    this._gotoTimestamp(prev, true);
  }

  private _gotoTimestamp(idx: number, animate: boolean): void {
    const clamped = Math.max(0, Math.min(this.totalTimestamps - 1, idx));
    this.currentTimestampIndex = clamped;

    this.progressSlider.value = String(clamped);
    this._updateTimestampDisplay();
    this._highlightTimestampItem(clamped);

    this.callbacks.onTimestampChange(clamped, animate);
  }

  private _setAltitudeIndex(idx: number): void {
    const clamped = Math.max(0, Math.min(this.altitudes.length - 1, idx));
    this.currentAltitudeIndex = clamped;
    this.altitudeSlider.value = String(clamped);
    this._updateAltitudeDisplay();
    this.callbacks.onAltitudeChange(clamped);
  }

  // ============ UI 更新方法 ============

  private _updateAltitudeDisplay(): void {
    const altitude = this.altitudes[this.currentAltitudeIndex] || 5000;
    this.altitudeValueEl.textContent = `${altitude.toLocaleString()} m`;
  }

  private _updateTimestampDisplay(): void {
    const t = this.currentTimestampIndex * 2;
    this.currentTimeEl.textContent = `T+${t}h`;
  }

  private _highlightTimestampItem(activeIndex: number): void {
    const items = this.timestampList.querySelectorAll('.timestamp-item');
    items.forEach((item, i) => {
      if (i === activeIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  updateAvgTemp(tempC: number): void {
    this.avgTempEl.textContent = `${tempC.toFixed(1)}°C`;
  }

  updateCurrentTimeLabel(label: string): void {
    this.currentTimeEl.textContent = label;
  }

  hideLoading(): void {
    this.loadingOverlay.classList.add('hidden');
  }

  showLoading(): void {
    this.loadingOverlay.classList.remove('hidden');
  }

  // ============ 动画循环更新 ============

  update(delta: number): void {
    // OrbitControls 阻尼效果更新
    this.orbitControls.update();
  }

  // ============ 资源清理 ============

  dispose(): void {
    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
    }
    this.orbitControls.dispose();
  }
}
