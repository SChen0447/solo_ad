import { createGameState, updateGame, resetGameState, resizeGameState } from './gameState';
import { render, isRestartButtonClicked } from './renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let state = createGameState(canvas.width, canvas.height);

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  resizeGameState(state, w, h);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

window.addEventListener('keydown', (e) => {
  state.keys.add(e.code);

  if (e.code === 'Space') {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  state.keys.delete(e.code);
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    state.mouseDown = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isRestartButtonClicked(state, x, y)) {
      resetGameState(state);
    }
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    state.mouseDown = false;
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleTouch(e);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  handleTouch(e);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  state.touchLeft = false;
  state.touchRight = false;
  state.touchFire = false;
}, { passive: false });

function handleTouch(e: TouchEvent): void {
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;

  state.touchLeft = false;
  state.touchRight = false;
  state.touchFire = false;

  for (let i = 0; i < e.touches.length; i++) {
    const t = e.touches[i];
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;

    if (isRestartButtonClicked(state, x, y)) {
      resetGameState(state);
      continue;
    }

    if (x < w * 0.3) {
      state.touchLeft = true;
    } else if (x > w * 0.7) {
      state.touchRight = true;
    }

    if (y < rect.height * 0.7) {
      state.touchFire = true;
    }
  }

  if (e.touches.length >= 2) {
    state.touchFire = true;
  }
}

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 1 / 30);
  lastTime = currentTime;

  updateGame(state, dt);

  ctx.clearRect(0, 0, state.width, state.height);
  render(ctx, state);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
