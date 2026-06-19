import { GameLogic } from './game/GameLogic';
import { Renderer } from './ui/Renderer';
import { InputHandler } from './ui/InputHandler';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas element #game not found');
}

const gameLogic = new GameLogic();
const renderer = new Renderer(canvas);
const input = new InputHandler(canvas, gameLogic, renderer);

input.attach();
gameLogic.init();

const MIN_FPS = 30;
const MIN_FRAME_INTERVAL = 1000 / MIN_FPS;
const MAX_FRAME_INTERVAL = 1000 / 20;

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function loop(now: number): void {
  const frameInterval = now - lastTime;
  lastTime = now;

  const clampedInterval = Math.min(frameInterval, MAX_FRAME_INTERVAL);
  fpsTimer += clampedInterval;

  if (frameInterval < MIN_FRAME_INTERVAL * 0.5) {
    requestAnimationFrame(loop);
    return;
  }

  gameLogic.update(clampedInterval);

  const renderStart = performance.now();
  renderer.draw(gameLogic.state);
  const renderTime = performance.now() - renderStart;
  if (renderTime > MIN_FRAME_INTERVAL * 0.5) {
    console.warn(`Render time: ${renderTime.toFixed(2)}ms`);
  }
  frameCount++;

  if (fpsTimer >= 2000) {
    const fps = (frameCount * 1000) / fpsTimer;
    if (fps < MIN_FPS) {
      console.warn(`Low FPS: ${fps.toFixed(1)}`);
    }
    frameCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
