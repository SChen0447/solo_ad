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

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function loop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;

  gameLogic.update(dt);
  renderer.draw(gameLogic.state);

  frameCount++;
  fpsTimer += dt;
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
