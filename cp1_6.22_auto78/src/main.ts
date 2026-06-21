import { Game } from './game';
import { Renderer } from './renderer';
import { InputManager } from './input';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Could not get 2D rendering context');
}

const game = new Game();
const renderer = new Renderer(ctx);
const input = new InputManager();

let lastTime = 0;
let frameCount = 0;
let fpsTimer = 0;
let currentFps = 60;

function gameLoop(timestamp: number): void {
  const deltaTime = lastTime ? Math.min(timestamp - lastTime, 100) : 16.67;
  lastTime = timestamp;

  frameCount++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1000) {
    currentFps = Math.round((frameCount * 1000) / fpsTimer);
    console.log(`FPS: ${currentFps}`);
    frameCount = 0;
    fpsTimer = 0;
  }

  const direction = input.getDirection();
  game.update(deltaTime, direction, (x: number, y: number) => input.clampPosition(x, y));

  renderer.render(
    game.penguin,
    game.iceFloes,
    game.fishes,
    game.particles,
    game.score,
    game.TARGET_SCORE,
    game.level,
    game.energy,
    game.MAX_ENERGY,
    game.wavePhase,
    game.gameStatus
  );

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    if (game.gameStatus === 'victory') {
      game.nextLevel();
    } else if (game.gameStatus === 'gameover') {
      game.reset();
    }
  }
});

requestAnimationFrame(gameLoop);
