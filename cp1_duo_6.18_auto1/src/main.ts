import { EventBus, GameEngine } from './engine';
import { Renderer } from './renderer';
import { UIManager } from './ui';

class Game {
  private canvas: HTMLCanvasElement;
  private eventBus: EventBus;
  private engine: GameEngine;
  private renderer: Renderer;
  private ui: UIManager;
  private lastTime: number = 0;
  private animationId: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFPS: number = 0;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');

    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Game canvas not found');

    this.resizeCanvas();
    window.addEventListener('resize', this.handleResize.bind(this));

    this.eventBus = new EventBus();
    this.engine = new GameEngine(this.eventBus, this.canvas.width, this.canvas.height);
    this.renderer = new Renderer(this.canvas);
    this.ui = new UIManager(this.canvas, this.eventBus, this.engine);

    this.start();
  }

  private resizeCanvas(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    if (this.engine) {
      this.engine.resize(rect.width, rect.height);
    }
    if (this.renderer) {
      this.renderer.resize(rect.width, rect.height);
    }
    if (this.ui) {
      this.ui.resize();
    }
  }

  private handleResize(): void {
    this.resizeCanvas();
  }

  private start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    if (this.fpsUpdateTime >= 1000) {
      this.currentFPS = Math.round(this.frameCount * 1000 / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }

    try {
      this.engine.update(deltaTime);
      this.renderer.render(this.engine, deltaTime);
      this.ui.render();
    } catch (error) {
      console.error('Game loop error:', error);
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  public getFPS(): number {
    return this.currentFPS;
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}

let game: Game | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    game = new Game();
    console.log('星轨弹射游戏已启动');
  } catch (error) {
    console.error('游戏初始化失败:', error);
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (game) {
      game.destroy();
      game = null;
    }
  });
}
