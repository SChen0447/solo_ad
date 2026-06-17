import { Emitter, EmitterConfig, MAX_PARTICLES } from './emitter';
import { Renderer, WALL_THICKNESS } from './renderer';
import { Controls } from './controls';

class ParticleApp {
  private emitter: Emitter;
  private renderer: Renderer;
  private fpsStat: HTMLElement;
  private particleStat: HTMLElement;

  private lastTime: number = 0;
  private fpsAccumulator: number = 0;
  private fpsFrames: number = 0;
  private currentFps: number = 60;

  constructor() {
    const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    const controlsPanel = document.getElementById('controls-panel') as HTMLElement;
    this.fpsStat = document.getElementById('fps-stat') as HTMLElement;
    this.particleStat = document.getElementById('particle-stat') as HTMLElement;

    this.emitter = new Emitter();
    this.renderer = new Renderer(canvas);

    const initialConfig: EmitterConfig = this.emitter.getConfig();
    new Controls(controlsPanel, initialConfig, (config) => {
      this.emitter.setConfig(config);
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.emitter.setEmitterPosition(x, y);
    });

    this.start();
  }

  private start(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.update(dt);
      this.render();
      this.updateStats(dt);

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    const w = this.renderer.getWidth();
    const h = this.renderer.getHeight();
    this.emitter.update(dt, w, h, WALL_THICKNESS);
  }

  private render(): void {
    const particles = this.emitter.getParticles();
    const config = this.emitter.getConfig();
    this.renderer.render(particles, config.sceneType);
  }

  private updateStats(dt: number): void {
    this.fpsFrames++;
    this.fpsAccumulator += dt;
    if (this.fpsAccumulator >= 0.25) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccumulator);
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }

    this.fpsStat.textContent = `FPS: ${this.currentFps}`;
    const count = this.emitter.getActiveCount();
    this.particleStat.textContent = `粒子: ${count} / ${MAX_PARTICLES}`;

    if (this.emitter.isOverThreshold()) {
      this.particleStat.classList.add('warning');
    } else {
      this.particleStat.classList.remove('warning');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ParticleApp();
});
