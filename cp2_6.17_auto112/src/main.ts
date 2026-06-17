import { Simulation } from './simulation';
import { Renderer } from './renderer';
import { UI } from './ui';
import { SCENE_WIDTH, SCENE_HEIGHT } from './entities';

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

class App {
  private app!: HTMLElement;
  private mainContainer!: HTMLElement;
  private sceneCanvas!: HTMLCanvasElement;
  private chartCanvas!: HTMLCanvasElement;
  private simulation!: Simulation;
  private renderer!: Renderer;
  private ui!: UI;

  private lastFrameTime = 0;
  private animationId = 0;
  private rafPending = false;

  start(): void {
    this.app = document.getElementById('app')!;
    this.buildDOM();
    this.simulation = new Simulation();
    this.renderer = new Renderer(this.sceneCanvas, this.chartCanvas);
    this.ui = new UI(this.simulation, this.mainContainer);
    this.lastFrameTime = performance.now();
    this.loop();
  }

  private buildDOM(): void {
    const header = document.createElement('div');
    header.className = 'eco-header';
    const title = document.createElement('h1');
    title.className = 'eco-title';
    title.textContent = '生态模拟器';
    header.appendChild(title);
    this.app.appendChild(header);

    this.mainContainer = document.createElement('div');
    this.mainContainer.className = 'eco-main-container';
    this.mainContainer.style.cssText = `
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 12px;
      padding-top: 10px;
      padding-bottom: 90px;
      flex: 1;
      width: 100%;
    `;

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'eco-canvas-wrap';
    canvasContainer.style.cssText = `
      position: relative;
      line-height: 0;
    `;

    this.sceneCanvas = document.createElement('canvas');
    this.sceneCanvas.width = SCENE_WIDTH;
    this.sceneCanvas.height = SCENE_HEIGHT;
    this.sceneCanvas.className = 'eco-scene-canvas';
    this.sceneCanvas.style.cssText = `
      display: block;
      border-radius: 2px;
    `;
    canvasContainer.appendChild(this.sceneCanvas);

    this.mainContainer.appendChild(canvasContainer);

    const rightColumn = document.createElement('div');
    rightColumn.className = 'eco-right-column';
    rightColumn.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 0;
    `;

    this.chartCanvas = document.createElement('canvas');
    this.chartCanvas.width = 200;
    this.chartCanvas.height = 150;
    this.chartCanvas.className = 'eco-chart-canvas';
    rightColumn.appendChild(this.chartCanvas);

    this.mainContainer.appendChild(rightColumn);

    this.app.appendChild(this.mainContainer);

    const globalStyles = document.createElement('style');
    globalStyles.textContent = `
      .eco-header {
        width: 100%;
        height: 50px;
        background: #3e2723;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        flex-shrink: 0;
      }
      .eco-title {
        margin: 0;
        padding: 0;
        color: #ffffff;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 2px;
        text-shadow: 0 2px 4px #000;
      }
      #app {
        position: relative;
      }
    `;
    document.head.appendChild(globalStyles);
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(() => {
      if (!this.rafPending) {
        this.rafPending = true;
        queueMicrotask(() => {
          this.tick();
          this.rafPending = false;
        });
      }
      this.loop();
    });
  };

  private tick(): void {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= FRAME_INTERVAL) {
      const steps = Math.min(3, Math.floor(elapsed / FRAME_INTERVAL));
      for (let i = 0; i < steps; i++) {
        this.simulation.step();
      }
      this.lastFrameTime = now - (elapsed - steps * FRAME_INTERVAL);

      this.ui.update();
      const stats = this.simulation.getStats();
      this.renderer.render(
        this.simulation.organisms,
        this.simulation.foods,
        stats,
        this.simulation.getPopulationHistory()
      );
      this.ui.updateStats(stats);
    }
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => {
  app.start();
});
