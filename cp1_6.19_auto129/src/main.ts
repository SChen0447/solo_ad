import { GameEngine } from './GameEngine';

function main(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const engine = new GameEngine(canvas);

  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    setTimeout(() => {
      loadingEl.style.transition = 'opacity 0.6s ease';
      loadingEl.style.opacity = '0';
      setTimeout(() => {
        if (loadingEl.parentNode) {
          loadingEl.parentNode.removeChild(loadingEl);
        }
      }, 600);
    }, 400);
  }

  let running = true;

  function frame(now: number): void {
    if (!running) return;
    try {
      engine.loop(now);
    } catch (e) {
      console.error('Game loop error:', e);
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame((t) => {
    engine.lastFrame = t;
    requestAnimationFrame(frame);
  });

  window.addEventListener('beforeunload', () => {
    running = false;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
