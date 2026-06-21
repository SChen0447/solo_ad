import { ParticleSystem } from './particleSystem';
import { FieldManager } from './fieldManager';
import { Renderer } from './renderer';
import { GameLoop } from './gameLoop';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

canvas.width = 800;
canvas.height = 600;

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Failed to get 2D context');
}

const fieldManager = new FieldManager();
const particleSystem = new ParticleSystem(fieldManager);
const renderer = new Renderer(ctx, 800, 600);
const gameLoop = new GameLoop(particleSystem, fieldManager, renderer);

gameLoop.loadLevel(0);

document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Tab') {
    e.preventDefault();
  }
  if (e.key === 'r' || e.key === 'R') {
    gameLoop.restartLevel();
    return;
  }
  gameLoop.handleKeyDown(e.key);
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  gameLoop.handleMouseDown(x, y);
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  gameLoop.handleMouseMove(x, y);
});

canvas.addEventListener('mouseup', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  gameLoop.handleMouseUp(x, y);
});

function loop(timestamp: number): void {
  gameLoop.update(timestamp);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
