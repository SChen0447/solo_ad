import './style.css';
import { SceneManager } from './scene/SceneManager';
import { ParticleSystem } from './particle/ParticleSystem';
import { UIPanel } from './controls/UIPanel';

class App {
  private sceneManager: SceneManager;
  private particleSystem: ParticleSystem;
  private uiPanel: UIPanel;
  private isPaused: boolean = false;
  private fpsCounter: HTMLDivElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    this.sceneManager = new SceneManager({ canvas });

    this.particleSystem = new ParticleSystem({
      density: 1.0,
      windSpeed: 8,
      windDirection: 45,
      turbulence: 0.3
    });

    this.sceneManager.createParticleSystem(this.particleSystem.getParticleCount());

    this.uiPanel = new UIPanel('ui-container', {
      onDensityChange: this.onDensityChange.bind(this),
      onWindSpeedChange: this.onWindSpeedChange.bind(this),
      onWindDirectionChange: this.onWindDirectionChange.bind(this),
      onTurbulenceChange: this.onTurbulenceChange.bind(this),
      onResetView: this.onResetView.bind(this),
      onPauseToggle: this.onPauseToggle.bind(this)
    });

    this.fpsCounter = this.createFpsCounter();

    this.sceneManager.setOnFrameCallback(this.onFrame.bind(this));
    this.sceneManager.startAnimation();
  }

  private createFpsCounter(): HTMLDivElement {
    const counter = document.createElement('div');
    counter.className = 'fps-counter';
    counter.innerHTML = `
      <div>FPS: <span class="fps-value">--</span></div>
      <div class="particle-count">粒子: <span class="particle-value">--</span></div>
    `;
    document.body.appendChild(counter);
    return counter;
  }

  private onDensityChange(value: number): void {
    this.particleSystem.setParams({ density: value });
    const newCount = this.particleSystem.getParticleCount();
    this.sceneManager.createParticleSystem(newCount);
  }

  private onWindSpeedChange(value: number): void {
    this.particleSystem.setParams({ windSpeed: value });
  }

  private onWindDirectionChange(value: number): void {
    this.particleSystem.setParams({ windDirection: value });
  }

  private onTurbulenceChange(value: number): void {
    this.particleSystem.setParams({ turbulence: value });
  }

  private onResetView(): void {
    this.sceneManager.resetCamera();
  }

  private onPauseToggle(isPaused: boolean): void {
    this.isPaused = isPaused;
  }

  private onFrame(delta: number): void {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.updateFpsDisplay();
    }

    if (!this.isPaused) {
      this.particleSystem.update(delta);
      this.sceneManager.updateParticlePositions(this.particleSystem.getPositions());
      this.sceneManager.updateParticleColors(this.particleSystem.getColors());
      this.sceneManager.updateParticleSizes(this.particleSystem.getSizes());
    }
  }

  private updateFpsDisplay(): void {
    const fpsValue = this.fpsCounter.querySelector('.fps-value');
    const particleValue = this.fpsCounter.querySelector('.particle-value');
    
    if (fpsValue) {
      fpsValue.textContent = this.currentFps.toString();
    }
    if (particleValue) {
      particleValue.textContent = this.particleSystem.getParticleCount().toLocaleString();
    }
  }

  public dispose(): void {
    this.sceneManager.dispose();
    this.uiPanel.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  
  window.addEventListener('beforeunload', () => {
    app.dispose();
  });
});
