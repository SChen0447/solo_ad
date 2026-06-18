import { GameManager } from './GameManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

function resizeCanvas() {
  const container = document.getElementById('game-container')!;
  const windowW = window.innerWidth;
  const windowH = window.innerHeight;
  const targetRatio = 16 / 9;
  const windowRatio = windowW / windowH;

  let w: number, h: number;
  if (windowRatio > targetRatio) {
    h = Math.min(windowH, 720);
    w = h * targetRatio;
  } else {
    w = Math.min(windowW, 1280);
    h = w / targetRatio;
  }

  container.style.width = w + 'px';
  container.style.height = h + 'px';
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const game = new GameManager(canvas);
game.start();
