import { GameEngine } from './game/GameEngine';
import { Renderer } from './ui/Renderer';
import { InputHandler } from './ui/InputHandler';

class GameApp {
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private lastTime = 0;
  private animationFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.renderer = new Renderer(this.canvas);
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    const mapWidth = this.renderer.getMapWidth();
    const mapHeight = this.renderer.getMapHeight();

    this.engine = new GameEngine(mapWidth, mapHeight);
    this.inputHandler = new InputHandler(this.canvas, this.engine);

    this.engine.initializeDefaultUnits();

    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer?.resize(width, height);

    if (this.engine) {
      const mapWidth = this.renderer.getMapWidth();
      const mapHeight = this.renderer.getMapHeight();
      (this.engine as any).mapWidth = mapWidth;
      (this.engine as any).mapHeight = mapHeight;
    }
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.engine.update(deltaTime);

    const state = this.engine.getState();
    const selectionBox = this.inputHandler.getSelectionBox();
    const rightClickTarget = this.inputHandler.getRightClickTarget();

    this.renderer.draw(state, selectionBox, rightClickTarget);

    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.resize.bind(this));
    this.inputHandler?.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  (window as any).__gameApp = app;
});
