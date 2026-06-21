import { GameManager } from './gameManager';
import { GridRenderer } from './gridRenderer';
import { UIManager } from './uiManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

const gameManager = new GameManager();
const gridRenderer = new GridRenderer(ctx);
const uiManager = new UIManager(ctx, canvas, gameManager, gridRenderer);

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  uiManager.resize(window.innerWidth, window.innerHeight);
}

resize();
window.addEventListener('resize', resize);

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min(0.1, (currentTime - lastTime) / 1000);
  lastTime = currentTime;

  gameManager.update(deltaTime);
  uiManager.render(deltaTime);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
