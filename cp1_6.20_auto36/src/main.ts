import { GameEngine } from './game/GameEngine';
import { Renderer } from './render/Renderer';
import { UIManager } from './ui/UIManager';
import { InputHandler, type GravityDirection } from './utils/InputHandler';

class Game {
  private canvas: HTMLCanvasElement;
  private gameEngine: GameEngine;
  private renderer: Renderer;
  private uiManager: UIManager;
  private inputHandler: InputHandler;
  private lastTime = 0;
  private animationId: number | null = null;
  private fps = 60;
  private frameCount = 0;
  private fpsUpdateTime = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas not found');

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.gameEngine = new GameEngine(this.canvas.width, this.canvas.height);
    this.renderer = new Renderer(this.canvas);
    this.uiManager = new UIManager(this.renderer.getContext(), this.canvas);
    this.inputHandler = new InputHandler((direction: GravityDirection) => {
      this.gameEngine.setGravityDirection(direction);
    });

    window.addEventListener('restartGame', () => {
      this.gameEngine.restart();
    });
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.gameEngine) {
      this.gameEngine.resize(this.canvas.width, this.canvas.height);
    }
    if (this.renderer) {
      this.renderer.resize();
    }
    if (this.uiManager) {
      this.uiManager.resize();
    }
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    if (this.fpsUpdateTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }

    this.gameEngine.update(deltaTime);
    const state = this.gameEngine.getState();
    this.renderer.render(state);
    this.uiManager.render(state, deltaTime);

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public start(): void {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

const game = new Game();
game.start();
