import { SimulationEngine } from './SimulationEngine';
import { Renderer3D } from './Renderer3D';
import { UIControls } from './controls/UIControls';

class GravitySimulatorApp {
  private engine: SimulationEngine;
  private renderer: Renderer3D;
  private controls: UIControls;
  private clock: { start: number; last: number; elapsed: number } = {
    start: 0,
    last: 0,
    elapsed: 0,
  };
  private rafId: number = 0;
  private running: boolean = false;

  constructor() {
    this.engine = new SimulationEngine();

    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.renderer = new Renderer3D(container);
    this.controls = new UIControls(this.engine, this.renderer);

    this.engine.onCollision((event) => {
      this.renderer.createCollisionParticles(event);
    });

    this.clock.start = performance.now();
    this.clock.last = this.clock.start;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private animate = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const rawDelta = (now - this.clock.last) / 1000;
    this.clock.last = now;
    this.clock.elapsed += rawDelta;

    const deltaTime = Math.min(rawDelta, 0.05);

    this.engine.update(deltaTime);

    const allBodies = this.engine.getAllBodies();
    this.renderer.render(deltaTime, allBodies);

    this.controls.update(this.clock.elapsed);

    this.rafId = requestAnimationFrame(this.animate);
  };

  dispose(): void {
    this.stop();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

let app: GravitySimulatorApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    app = new GravitySimulatorApp();
    app.start();
    console.log('🌌 三维重力场与行星运动模拟器已启动');
  } catch (error) {
    console.error('启动失败:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});

export { GravitySimulatorApp };
