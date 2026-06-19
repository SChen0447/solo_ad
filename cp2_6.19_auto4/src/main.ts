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

const TARGET_FPS = 60;
const MIN_FPS = 30;
const FRAME_TIME_MAX = 1000 / MIN_FPS;
const FRAME_TIME_TARGET = 1000 / TARGET_FPS;

let lastTime = performance.now();
let accumulator = 0;
let frameCount = 0;
let fpsTimer = 0;
let lastRenderTime = 0;

function loop(now: number): void {
  let frameTime = now - lastTime;
  lastTime = now;

  if (frameTime > FRAME_TIME_MAX) {
    frameTime = FRAME_TIME_MAX;
  }

  accumulator += frameTime;
  fpsTimer += frameTime;

  while (accumulator >= FRAME_TIME_TARGET) {
    gameLogic.update(FRAME_TIME_TARGET);
    accumulator -= FRAME_TIME_TARGET;
  }

  const timeSinceLastRender = now - lastRenderTime;
  if (timeSinceLastRender >= FRAME_TIME_TARGET * 0.9) {
    const renderStart = performance.now();
    renderer.draw(gameLogic.state);
    const renderTime = performance.now() - renderStart;
    if (renderTime > 8) {
      console.warn(`Render time: ${renderTime.toFixed(2)}ms`);
    }
    lastRenderTime = now;
    frameCount++;
  }

  if (fpsTimer >= 2000) {
    const fps = (frameCount * 1000) / fpsTimer;
    if (fps < 30) {
      console.warn(`Low FPS: ${fps.toFixed(1)}`);
    }
    frameCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
