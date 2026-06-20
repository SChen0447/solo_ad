import * as THREE from 'three';
import { PlantSystem } from './plantSystem';
import { EnvironmentPanel } from './environmentPanel';
import { VisualEffects } from './visualEffects';
import { CameraControls } from './cameraControls';

const FIXED_TIMESTEP = 1 / 60;
const MAX_FRAME_TIME = 0.25;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private appContainer: HTMLElement;

  private plantSystem: PlantSystem;
  private environmentPanel: EnvironmentPanel;
  private visualEffects: VisualEffects;
  private cameraControls: CameraControls;

  private actualTime = 0;
  private accumulator = 0;
  private lastFrameTime = 0;
  private rafId = 0;

  private fpsCounter = {
    frames: 0,
    lastTime: 0,
    value: 60
  };
  private fpsDisplay: HTMLElement | null = null;

  constructor() {
    this.appContainer = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 8);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.appContainer.appendChild(this.renderer.domElement);

    this.plantSystem = new PlantSystem();
    this.scene.add(this.plantSystem.group);

    this.visualEffects = new VisualEffects(this.scene);

    this.environmentPanel = new EnvironmentPanel(
      this.appContainer,
      (params) => this.onEnvironmentChange(params)
    );

    this.cameraControls = new CameraControls(
      this.camera,
      this.renderer.domElement,
      this.appContainer,
      this.plantSystem
    );

    this.createFPSDisplay();
    this.setupEvents();
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private createFPSDisplay(): void {
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      color: #4ade80;
      font-family: monospace;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      z-index: 200;
      pointer-events: none;
      opacity: 0.7;
    `;
    this.fpsDisplay.textContent = '60 FPS';
    this.appContainer.appendChild(this.fpsDisplay);
  }

  private onEnvironmentChange(params: Partial<{ light: number; water: number; temperature: number }>): void {
    this.plantSystem.setEnvironmentParams(params);
    const currentParams = this.environmentPanel.getParams();
    this.visualEffects.updateLightParams(currentParams);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private updateFPS(now: number): void {
    this.fpsCounter.frames++;
    if (now - this.fpsCounter.lastTime >= 500) {
      const elapsed = (now - this.fpsCounter.lastTime) / 1000;
      this.fpsCounter.value = Math.round(this.fpsCounter.frames / elapsed);
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;
      if (this.fpsDisplay) {
        const fps = this.fpsCounter.value;
        const color = fps >= 55 ? '#4ade80' : fps >= 30 ? '#fbbf24' : '#ef4444';
        this.fpsDisplay.style.color = color;
        this.fpsDisplay.textContent = `${fps} FPS`;
      }
    }
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    let delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (delta > MAX_FRAME_TIME) {
      delta = MAX_FRAME_TIME;
    }

    this.updateFPS(now);

    const isReplayMode = this.cameraControls.isReplayMode();
    const isRecording = this.cameraControls.isRecording();

    if (!isReplayMode) {
      this.accumulator += delta;

      while (this.accumulator >= FIXED_TIMESTEP) {
        this.plantSystem.update(FIXED_TIMESTEP, this.actualTime);
        this.actualTime += FIXED_TIMESTEP;
        this.accumulator -= FIXED_TIMESTEP;

        if (isRecording) {
          this.plantSystem.recordSnapshot();
        }
      }
    }

    this.visualEffects.update(delta, this.actualTime);
    this.cameraControls.update(delta);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.cameraControls.dispose();
    this.visualEffects.dispose();
    this.renderer.dispose();
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) app.dispose();
});
