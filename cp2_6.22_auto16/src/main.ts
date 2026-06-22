import { createSystemState, update, SystemState } from './system';
import { render } from './render';
import { setupInputHandlers } from './input';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function main(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas 2D context not available');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const state: SystemState = createSystemState(CANVAS_WIDTH, CANVAS_HEIGHT);

  setupInputHandlers(canvas, state);

  let lastTime = performance.now();

  const gameLoop = (currentTime: number): void => {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    update(state, dt);
    render(ctx, state);

    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
