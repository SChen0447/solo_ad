import { EntityManager } from './systems/EntityManager';
import { RenderManager } from './render/RenderManager';

const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
const FPS_SAMPLE_SIZE = 30;

export function initGame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const entityManager = new EntityManager();
  const renderManager = new RenderManager(ctx, entityManager);

  entityManager.init();

  let lastTime = 0;
  let accumulator = 0;
  let fpsSamples: number[] = [];
  let lastFpsCheck = 0;

  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (entityManager.gameOver && !entityManager.restarting) {
        entityManager.requestRestart();
      }
    }
    entityManager.player.handleKeyDown(e);
  });

  document.addEventListener('keyup', (e) => {
    entityManager.player.handleKeyUp(e);
  });

  function gameLoop(timestamp: number) {
    if (lastTime === 0) {
      lastTime = timestamp;
    }

    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    fpsSamples.push(dt);
    if (fpsSamples.length > FPS_SAMPLE_SIZE) {
      fpsSamples.shift();
    }

    if (timestamp - lastFpsCheck > 500) {
      lastFpsCheck = timestamp;
      const avgDt = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
      const currentFps = 1 / avgDt;
      entityManager.vfx.lowPerformance = currentFps < 30;
    }

    const now = performance.now();
    accumulator += dt;

    while (accumulator >= FRAME_TIME / 1000) {
      const stepDt = FRAME_TIME / 1000;
      entityManager.update(stepDt, now);
      accumulator -= stepDt;
    }

    const timeSeconds = timestamp / 1000;
    renderManager.render(timeSeconds);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (canvas) {
  initGame(canvas);
}
