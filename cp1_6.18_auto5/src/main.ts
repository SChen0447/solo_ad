import { GameEngine } from './GameEngine';

class App {
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;
    this.setupCanvas();
    this.engine = new GameEngine(this.canvas);
    this.engine.resize();
    this.engine.start();
  }

  private setupCanvas(): void {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const aspect = 16 / 9;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = Math.floor(w);
    this.canvas.height = Math.floor(h);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
