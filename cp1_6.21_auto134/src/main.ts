import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { EnvironmentManager } from './environment';
import { PlantModel } from './plantModel';
import { UIController } from './uiController';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private environment: EnvironmentManager;
  private plant: PlantModel;
  private uiController: UIController;
  private clock: THREE.Clock;

  private simTimeSeconds: number = 6 * 3600;
  private readonly TIME_SCALE: number = 60;
  private readonly DAY_DURATION: number = 30;
  private dayTimer: number = 0;
  private dailyLightAccumulator: number = 0;
  private dailyTimeAccumulator: number = 0;
  private totalLightIntegral: number = 0;

  private clockEl: HTMLElement | null = null;
  private integralEl: HTMLElement | null = null;
  private heightEl: HTMLElement | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.environment = new EnvironmentManager(this.scene);
    this.plant = new PlantModel(this.scene);
    this.uiController = new UIController();
    this.clock = new THREE.Clock();
  }

  public init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupInfoElements();
    this.environment.init();
    this.plant.init();
    this.uiController.init((angle, intensity, color) => {
      this.environment.updateLightParams(angle, intensity, color);
      const lightDir = this.environment.getLightDirection();
      this.plant.updateLightResponse(lightDir, intensity);
    });
    const initialColor = new THREE.Color(0xffeedd);
    this.environment.updateLightParams(45, 0.7, initialColor);
    const lightDir = this.environment.getLightDirection();
    this.plant.updateLightResponse(lightDir, 0.7);
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
    this.animate();
  }

  private setupRenderer(): void {
    const container = document.getElementById('app');
    if (!container) throw new Error('Container #app not found');
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera.fov = 50;
    this.camera.near = 0.1;
    this.camera.far = 100;
    this.camera.position.set(5, 2.5, 5);
    this.camera.lookAt(0, 0.5, 0);
    this.camera.updateProjectionMatrix();
  }

  private setupInfoElements(): void {
    this.clockEl = document.getElementById('clock');
    this.integralEl = document.getElementById('light-integral');
    this.heightEl = document.getElementById('plant-height');
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateSimulationTime(delta: number): void {
    const scaledDelta = delta * this.TIME_SCALE;
    this.simTimeSeconds += scaledDelta;
    if (this.simTimeSeconds >= 86400) {
      this.simTimeSeconds -= 86400;
    }
    this.dayTimer += delta;
    const intensity = this.uiController.getIntensity();
    this.dailyLightAccumulator += intensity * delta;
    this.dailyTimeAccumulator += delta;
    if (this.dayTimer >= this.DAY_DURATION) {
      const avgIntensity = this.dailyTimeAccumulator > 0 
        ? this.dailyLightAccumulator / this.dailyTimeAccumulator 
        : 0;
      const dailyIntegral = Math.round(avgIntensity * 1000);
      this.totalLightIntegral += dailyIntegral;
      this.plant.growIfNeeded(dailyIntegral);
      this.dayTimer = 0;
      this.dailyLightAccumulator = 0;
      this.dailyTimeAccumulator = 0;
    }
  }

  private formatTime(totalSeconds: number): string {
    const s = Math.floor(totalSeconds) % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600) % 24;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private updateUI(): void {
    if (this.clockEl) {
      this.clockEl.textContent = this.formatTime(this.simTimeSeconds);
    }
    if (this.integralEl) {
      this.integralEl.textContent = Math.round(this.totalLightIntegral).toString();
    }
    if (this.heightEl) {
      this.heightEl.textContent = this.plant.getHeightPercentage().toString();
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    TWEEN.update();
    this.updateSimulationTime(delta);
    this.environment.updateTrail(delta);
    this.updateUI();
    this.renderer.render(this.scene, this.camera);
  };
}

const app = new Application();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
