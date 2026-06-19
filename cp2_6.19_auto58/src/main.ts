import { SimulationEngine } from './SimulationEngine';
import { Renderer3D } from './Renderer3D';
import { UIControls } from './controls/UIControls';

class Application {
  private engine: SimulationEngine;
  private renderer: Renderer3D;
  private controls: UIControls;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private startTime: number = 0;

  constructor() {
    this.engine = new SimulationEngine();
    this.renderer = new Renderer3D('canvas-container', this.engine);
    this.controls = new UIControls(this.engine, this.renderer);

    this.startTime = performance.now();
    this.lastTime = this.startTime;

    this.bindLifecycleEvents();
    this.loop();
  }

  private bindLifecycleEvents(): void {
    window.addEventListener('beforeunload', this.dispose);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.lastTime = performance.now();
    }
  };

  private loop = (): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const rawDelta = (now - this.lastTime) / 1000;
    const deltaTime = Math.min(rawDelta, 1 / 30);
    const elapsedTime = (now - this.startTime) / 1000;

    this.lastTime = now;

    this.renderer.update(deltaTime, elapsedTime);
  };

  private dispose = (): void => {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('beforeunload', this.dispose);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.controls.dispose();
    this.renderer.dispose();
  };
}

let app: Application | null = null;

const initApp = (): void => {
  if (app) return;
  app = new Application();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
