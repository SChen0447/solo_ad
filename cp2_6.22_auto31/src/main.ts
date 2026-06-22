import { Game, MAP_WIDTH, MAP_HEIGHT } from './game';
import { UIManager } from './ui';

const CANVAS_W = MAP_WIDTH + 240;
const CANVAS_H = MAP_HEIGHT;

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const gameCanvas: HTMLCanvasElement = canvas;

  const game = new Game({
    onGoldChange: () => {
      if (uiManager) {
        uiManager.triggerGoldBounce();
      }
    }
  });

  const uiManager = new UIManager(game, gameCanvas, () => {});

  let lastRenderTime = performance.now();

  function renderLoop(): void {
    const now = performance.now();
    const dt = (now - lastRenderTime) / 1000;
    lastRenderTime = now;

    uiManager.update(dt);
    uiManager.render();

    if (game.isGameOver()) {
      const ctx = gameCanvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束!', gameCanvas.width / 2, gameCanvas.height / 2 - 20);
      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`坚持到了第 ${game.wave} 波`, gameCanvas.width / 2, gameCanvas.height / 2 + 30);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '18px Arial';
      ctx.fillText('刷新页面重新开始', gameCanvas.width / 2, gameCanvas.height / 2 + 70);
    } else {
      requestAnimationFrame(renderLoop);
    }
  }

  game.start();
  requestAnimationFrame(renderLoop);
}

window.addEventListener('DOMContentLoaded', main);
