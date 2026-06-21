import { Game } from './Game';

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const BASE_W = 1280;
  const BASE_H = 720;

  const resizeCanvas = (): void => {
    const container = document.getElementById('game-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scale = Math.min(rect.width / BASE_W, rect.height / BASE_H);
    const displayW = BASE_W * scale;
    const displayH = BASE_H * scale;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
  };

  canvas.width = BASE_W;
  canvas.height = BASE_H;
  resizeCanvas();

  const game = new Game(canvas);

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
