import { Game } from './game';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Canvas 2D context not available');
}

const game = new Game(canvas, ctx);
game.start();

let lastTime = performance.now();

function loop(currentTime: number): void {
  const dt = Math.min(50, currentTime - lastTime);
  lastTime = currentTime;

  game.update(dt);
  game.render(dt);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
