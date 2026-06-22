import * as THREE from 'three';
import {
  TerrainParams,
  CameraState,
  SceneStats,
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_CAMERA_ELEVATION,
  DEFAULT_CAMERA_AZIMUTH,
  MIN_CAMERA_DISTANCE,
  MAX_CAMERA_DISTANCE,
  MIN_ELEVATION,
  MAX_ELEVATION,
  ROTATION_SPEED,
  COLOR_BG,
  DEFAULT_PARTICLE_COUNT,
  GRID_SIZE,
  TERRAIN_EXTENT,
} from '../types';
import { TerrainGenerator } from '../terrain/TerrainGenerator';
import { WaterSimulator } from '../water/WaterSimulator';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private terrainGenerator: TerrainGenerator;
  private waterSimulator: WaterSimulator;
  private cameraState: CameraState;
  private container: HTMLElement;
  private animationId: number = 0;
  private lastTime: number = 0;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private terrainParams: TerrainParams;
  private onParamsChange: ((params: TerrainParams) => void) | null = null;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private terrainMesh: THREE.Mesh | null = null;
  private uiPanel: HTMLElement | null = null;
  private fpsDisplay: HTMLElement | null = null;
  private statsDisplay: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.cameraState = {
      distance: DEFAULT_CAMERA_DISTANCE,
      azimuth: DEFAULT_CAMERA_AZIMUTH,
      elevation: DEFAULT_CAMERA_ELEVATION,
      targetX: 0,
      targetZ: 0,
    };

    this.terrainParams = {
      roughness: 0.5,
      altitude: 50,
      erosion: 0.3,
      seed: 42,
    };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLOR_BG);
    this.scene.fog = new THREE.Fog(COLOR_BG, 30, 60);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    this.directionalLight.position.set(20, 30, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.scene.add(this.directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2d5016, 0.3);
    this.scene.add(hemisphereLight);

    this.terrainGenerator = new TerrainGenerator();
    this.terrainMesh = this.terrainGenerator.generate(this.terrainParams);
    this.scene.add(this.terrainMesh);

    this.waterSimulator = new WaterSimulator(this.terrainGenerator);
    this.scene.add(this.waterSimulator.getMesh());
    this.scene.add(this.waterSimulator.getPoolGroup());

    this.updateCamera();
    this.setupControls();
    this.createUI();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateCamera(): void {
    const elevRad = (this.cameraState.elevation * Math.PI) / 180;
    const azimRad = (this.cameraState.azimuth * Math.PI) / 180;

    const x = this.cameraState.targetX + this.cameraState.distance * Math.cos(elevRad) * Math.sin(azimRad);
    const y = this.cameraState.distance * Math.sin(elevRad);
    const z = this.cameraState.targetZ + this.cameraState.distance * Math.cos(elevRad) * Math.cos(azimRad);

    this.camera.position.set(x, Math.max(y, 0.5), z);
    this.camera.lookAt(this.cameraState.targetX, 0, this.cameraState.targetZ);
  }

  private setupControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      this.cameraState.azimuth += dx * ROTATION_SPEED;
      this.cameraState.elevation += dy * ROTATION_SPEED * (180 / Math.PI) * 0.3;
      this.cameraState.elevation = Math.max(
        MIN_ELEVATION,
        Math.min(MAX_ELEVATION, this.cameraState.elevation)
      );

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCamera();
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.cameraState.distance += e.deltaY * 0.05;
      this.cameraState.distance = Math.max(
        MIN_CAMERA_DISTANCE,
        Math.min(MAX_CAMERA_DISTANCE, this.cameraState.distance)
      );
      this.updateCamera();
    }, { passive: false });

    canvas.addEventListener('dblclick', () => {
      this.cameraState.distance = DEFAULT_CAMERA_DISTANCE;
      this.cameraState.elevation = DEFAULT_CAMERA_ELEVATION;
      this.cameraState.azimuth = DEFAULT_CAMERA_AZIMUTH;
      this.cameraState.targetX = 0;
      this.cameraState.targetZ = 0;
      this.updateCamera();
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchDist = 0;

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        this.cameraState.azimuth += dx * ROTATION_SPEED;
        this.cameraState.elevation += dy * ROTATION_SPEED * (180 / Math.PI) * 0.3;
        this.cameraState.elevation = Math.max(MIN_ELEVATION, Math.min(MAX_ELEVATION, this.cameraState.elevation));
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        this.updateCamera();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = lastTouchDist - dist;
        this.cameraState.distance += delta * 0.1;
        this.cameraState.distance = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, this.cameraState.distance));
        lastTouchDist = dist;
        this.updateCamera();
      }
    }, { passive: false });
  }

  private createUI(): void {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(26, 26, 46, 0.85);
      border-radius: 12px;
      padding: 20px;
      color: #e2e8f0;
      font-size: 13px;
      min-width: 260px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(96, 165, 250, 0.15);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 10;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '🌄 地形水流探索器';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #60a5fa;
      letter-spacing: 0.5px;
    `;
    panel.appendChild(title);

    const sliders = [
      { key: 'roughness', label: '粗糙度', min: 0, max: 1, step: 0.01, value: this.terrainParams.roughness },
      { key: 'altitude', label: '海拔', min: 0, max: 100, step: 1, value: this.terrainParams.altitude },
      { key: 'erosion', label: '侵蚀度', min: 0, max: 1, step: 0.01, value: this.terrainParams.erosion },
      { key: 'seed', label: '种子', min: 1, max: 9999, step: 1, value: this.terrainParams.seed },
    ];

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .terrain-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #1e3a5f, #2563eb);
        outline: none;
        cursor: pointer;
        transition: all 0.2s;
      }
      .terrain-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #60a5fa;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 0 6px rgba(96, 165, 250, 0.4);
      }
      .terrain-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(96, 165, 250, 0.8);
      }
      .terrain-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #60a5fa;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        box-shadow: 0 0 6px rgba(96, 165, 250, 0.4);
      }
      .terrain-slider::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(96, 165, 250, 0.8);
      }
      .terrain-slider::-moz-range-track {
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #1e3a5f, #2563eb);
      }
    `;
    document.head.appendChild(styleEl);

    for (const s of sliders) {
      const row = document.createElement('div');
      row.style.cssText = 'margin-bottom: 12px;';

      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 4px;';

      const label = document.createElement('span');
      label.textContent = s.label;
      label.style.cssText = 'color: #94a3b8; font-size: 12px;';

      const valueSpan = document.createElement('span');
      valueSpan.textContent = String(s.value);
      valueSpan.style.cssText = 'color: #60a5fa; font-size: 12px; font-weight: 500;';

      labelRow.appendChild(label);
      labelRow.appendChild(valueSpan);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(s.min);
      slider.max = String(s.max);
      slider.step = String(s.step);
      slider.value = String(s.value);
      slider.className = 'terrain-slider';

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        (this.terrainParams as any)[s.key] = val;
        valueSpan.textContent = s.key === 'seed' ? String(Math.floor(val)) : val.toFixed(2);
        if (this.onParamsChange) {
          this.onParamsChange({ ...this.terrainParams });
        }
      });

      row.appendChild(labelRow);
      row.appendChild(slider);
      panel.appendChild(row);
    }

    const particleRow = document.createElement('div');
    particleRow.style.cssText = 'margin-bottom: 12px;';

    const pLabelRow = document.createElement('div');
    pLabelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 4px;';

    const pLabel = document.createElement('span');
    pLabel.textContent = '粒子数量';
    pLabel.style.cssText = 'color: #94a3b8; font-size: 12px;';

    const pValue = document.createElement('span');
    pValue.textContent = String(DEFAULT_PARTICLE_COUNT);
    pValue.style.cssText = 'color: #60a5fa; font-size: 12px; font-weight: 500;';

    pLabelRow.appendChild(pLabel);
    pLabelRow.appendChild(pValue);

    const pSlider = document.createElement('input');
    pSlider.type = 'range';
    pSlider.min = '50';
    pSlider.max = '2000';
    pSlider.step = '50';
    pSlider.value = String(DEFAULT_PARTICLE_COUNT);
    pSlider.className = 'terrain-slider';

    pSlider.addEventListener('input', () => {
      const val = parseInt(pSlider.value);
      this.waterSimulator.setParticleCount(val);
      pValue.textContent = String(val);
    });

    particleRow.appendChild(pLabelRow);
    particleRow.appendChild(pSlider);
    panel.appendChild(particleRow);

    const divider = document.createElement('div');
    divider.style.cssText = 'height: 1px; background: rgba(96, 165, 250, 0.15); margin: 12px 0;';
    panel.appendChild(divider);

    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = 'font-size: 12px; color: #94a3b8; line-height: 1.8;';
    statsDiv.innerHTML = `
      <div>FPS: <span id="fps-counter" style="color: #60a5fa; font-weight: 600;">0</span></div>
      <div>粗糙度: <span id="stat-roughness" style="color: #94a3b8;">${this.terrainParams.roughness.toFixed(2)}</span></div>
      <div>海拔: <span id="stat-altitude" style="color: #94a3b8;">${this.terrainParams.altitude}</span></div>
      <div>侵蚀度: <span id="stat-erosion" style="color: #94a3b8;">${this.terrainParams.erosion.toFixed(2)}</span></div>
      <div>粒子数: <span id="stat-particles" style="color: #94a3b8;">${DEFAULT_PARTICLE_COUNT}</span></div>
    `;
    panel.appendChild(statsDiv);

    const hint = document.createElement('div');
    hint.style.cssText = `
      margin-top: 12px;
      font-size: 11px;
      color: #475569;
      line-height: 1.6;
    `;
    hint.innerHTML = '拖拽旋转 · 滚轮缩放 · 双击重置';
    panel.appendChild(hint);

    this.container.appendChild(panel);
    this.uiPanel = panel;
    this.fpsDisplay = document.getElementById('fps-counter');
    this.statsDisplay = statsDiv;
  }

  private updateStats(): void {
    const fpsEl = document.getElementById('fps-counter');
    if (fpsEl) fpsEl.textContent = String(this.currentFps);

    const rEl = document.getElementById('stat-roughness');
    if (rEl) rEl.textContent = this.terrainParams.roughness.toFixed(2);

    const aEl = document.getElementById('stat-altitude');
    if (aEl) aEl.textContent = String(Math.floor(this.terrainParams.altitude));

    const eEl = document.getElementById('stat-erosion');
    if (eEl) eEl.textContent = this.terrainParams.erosion.toFixed(2);

    const pEl = document.getElementById('stat-particles');
    if (pEl) pEl.textContent = String(this.waterSimulator.getParticleCount());
  }

  setOnParamsChange(callback: (params: TerrainParams) => void): void {
    this.onParamsChange = callback;
  }

  regenerateTerrain(params: TerrainParams): void {
    this.terrainParams = { ...params };

    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
    }

    this.terrainMesh = this.terrainGenerator.generate(params);
    this.scene.add(this.terrainMesh);

    this.waterSimulator.reset(this.terrainGenerator);
    this.scene.remove(this.waterSimulator.getMesh());
    this.scene.remove(this.waterSimulator.getPoolGroup());
    this.scene.add(this.waterSimulator.getMesh());
    this.scene.add(this.waterSimulator.getPoolGroup());
  }

  start(): void {
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.fpsFrames = 0;
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.fpsFrames++;
    if (now - this.fpsTime >= 1000) {
      this.currentFps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTime = now;
      this.updateStats();
    }

    this.waterSimulator.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  dispose(): void {
    this.stop();
    this.terrainGenerator.dispose();
    this.waterSimulator.dispose();
    this.renderer.dispose();
    if (this.uiPanel && this.uiPanel.parentNode) {
      this.uiPanel.parentNode.removeChild(this.uiPanel);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
  }

  getTerrainParams(): TerrainParams {
    return { ...this.terrainParams };
  }
}
