import './style.css';
import { WindField } from './particle/WindField';
import { ParticleSystem } from './particle/ParticleSystem';
import { SceneManager } from './scene/SceneManager';
import { UIPanel } from './controls/UIPanel';

class App {
  private windField: WindField;
  private particleSystem: ParticleSystem;
  private sceneManager: SceneManager;
  private uiPanel: UIPanel;

  private canvas: HTMLCanvasElement;
  private elevationLabel: HTMLElement;
  private elevationValue: HTMLElement;
  private fpsCounter: HTMLElement;

  private lastTime: number = 0;
  private animationId: number = 0;
  private isPaused: boolean = false;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.elevationLabel = document.getElementById('elevation-label') as HTMLElement;
    this.elevationValue = document.getElementById('elevation-value') as HTMLElement;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;

    this.windField = new WindField();
    this.particleSystem = new ParticleSystem(this.windField);

    this.sceneManager = new SceneManager(this.canvas, this.particleSystem);

    this.uiPanel = new UIPanel(
      'gui-container',
      this.particleSystem,
      this.sceneManager,
      {
        onResetCamera: () => this.handleResetCamera(),
        onTogglePause: (paused: boolean) => this.handleTogglePause(paused)
      }
    );

    const params = this.uiPanel.getParams();
    this.particleSystem.setParams(params);

    this.setupCallbacks();
    this.start();
  }

  private setupCallbacks(): void {
    this.sceneManager.setOnMarkerClick(
      (index: number, elevation: number, screenX: number, screenY: number) => {
        this.showElevationLabel(elevation, screenX, screenY);
      }
    );

    this.sceneManager.setOnMarkerClose(() => {
      this.hideElevationLabel();
    });

    this.sceneManager.setFpsCallback((fps: number) => {
      this.updateFpsCounter(fps);
    });
  }

  private handleResetCamera(): void {
    this.sceneManager.resetCamera();
  }

  private handleTogglePause(paused: boolean): void {
    this.isPaused = paused;
    this.sceneManager.setPaused(paused);
  }

  private showElevationLabel(elevation: number, screenX: number, screenY: number): void {
    this.elevationValue.textContent = elevation.toFixed(1);
    this.elevationLabel.style.left = `${screenX}px`;
    this.elevationLabel.style.top = `${screenY}px`;
    this.elevationLabel.classList.add('visible');
  }

  private hideElevationLabel(): void {
    this.elevationLabel.classList.remove('visible');
  }

  private updateFpsCounter(fps: number): void {
    this.fpsCounter.textContent = `FPS: ${fps}`;
    this.fpsCounter.classList.remove('good', 'warning', 'bad');

    if (fps >= 50) {
      this.fpsCounter.classList.add('good');
    } else if (fps >= 30) {
      this.fpsCounter.classList.add('warning');
    } else {
      this.fpsCounter.classList.add('bad');
    }
  }

  private animate = (time: number): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (!this.isPaused) {
      this.sceneManager.update(deltaTime);
    }

    this.sceneManager.render(time);
  };

  private start(): void {
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.uiPanel.dispose();
    this.sceneManager.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});

export { App };
