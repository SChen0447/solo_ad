import { createSystemState, update, SystemState } from './system';
import { render } from './render';
import { setupInputHandlers } from './input';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHAKE_DURATION = 0.05;
const SHAKE_INTENSITY = 4;

interface ScreenShake {
  time: number;
  duration: number;
  intensity: number;
  dirX: number;
  dirY: number;
  x: number;
  y: number;
}

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

  const shake: ScreenShake = {
    time: 0,
    duration: SHAKE_DURATION,
    intensity: SHAKE_INTENSITY,
    dirX: 0,
    dirY: 0,
    x: 0,
    y: 0
  };

  const triggerShake = (): void => {
    const angle = Math.random() * Math.PI * 2;
    shake.dirX = Math.cos(angle);
    shake.dirY = Math.sin(angle);
    shake.time = shake.duration;
  };

  setupInputHandlers(canvas, state, triggerShake);

  let lastTime = performance.now();

  const gameLoop = (currentTime: number): void => {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    if (shake.time > 0) {
      shake.time -= dt;
      if (shake.time > 0) {
        const t = shake.time / shake.duration;
        shake.x = shake.dirX * shake.intensity * t;
        shake.y = shake.dirY * shake.intensity * t;
      } else {
        shake.x = 0;
        shake.y = 0;
      }
    }

    update(state, dt);
    render(ctx, state, shake.x, shake.y);

    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
