import { Game } from './game';
import { Renderer } from './renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new Game();
const renderer = new Renderer(canvas);

let lastTime = 0;
let animationFrameId: number;

function gameLoop(currentTime: number) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  game.update(dt);

  renderer.render(game, dt);

  animationFrameId = requestAnimationFrame(gameLoop);
}

function handleKeyDown(e: KeyboardEvent) {
  game.handleKeyDown(e);
}

function handleKeyUp(e: KeyboardEvent) {
  game.handleKeyUp(e);
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

window.addEventListener('blur', () => {
  game.input.left = false;
  game.input.right = false;
  game.input.jump = false;
  game.input.slow = false;
  game.input.rewind = false;
  game.input.rewindQ = false;
  game.input.rewindW = false;
  game.input.rewindE = false;
  game.input.interact = false;
});

lastTime = performance.now();
animationFrameId = requestAnimationFrame(gameLoop);
