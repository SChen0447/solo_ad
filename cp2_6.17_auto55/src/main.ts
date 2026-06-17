import { Emitter, ParticleConfig, PhysicsScene } from './emitter';
import { Renderer } from './renderer';
import { Controls } from './controls';

class App {
  private emitter: Emitter;
  private renderer: Renderer;
  private canvasContainer: HTMLElement;
  private canvas: HTMLCanvasElement;
  private lastTime: number = 0;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;

    this.emitter = new Emitter();
    this.renderer = new Renderer(this.canvas);
    new Controls(
      document.getElementById('control-panel')!,
      {
        onConfigChange: this.handleConfigChange.bind(this),
        onSceneChange: this.handleSceneChange.bind(this),
        onCollisionToggle: this.handleCollisionToggle.bind(this)
      }
    );

    this.handleResize();
    window.addEventListener('resize', this.handleResize.bind(this));

    this.start();
  }

  private handleConfigChange(config: Partial<ParticleConfig>): void {
    this.emitter.setConfig(config);
  }

  private handleSceneChange(scene: PhysicsScene): void {
    this.emitter.setScene(scene);
    this.renderer.setScene(scene);
  }

  private handleCollisionToggle(enabled: boolean): void {
    this.renderer.setOptions({ showCollision: enabled });
  }

  private handleResize(): void {
    const width = this.canvasContainer.clientWidth;
    const height = this.canvasContainer.clientHeight;
    this.renderer.setSize(width, height);
    this.emitter.setCanvasSize(width, height);
  }

  private start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    const currentTime = performance.now();
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    const particles = this.emitter.update(dt);
    this.renderer.render(particles, dt);

    requestAnimationFrame(() => this.loop());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
