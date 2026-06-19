import { GameEngine } from './GameEngine';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

const engine = new GameEngine();
const renderer = new Renderer(canvas, engine);
const audio = new AudioManager();
new InputManager(canvas, engine, renderer, audio);

let lastTime = performance.now();
let frameCount = 0;
let fps = 0;
let fpsTimer = 0;

function gameLoop(currentTime: number) {
  const deltaTime = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;

  engine.update(deltaTime);
  renderer.updateDonutAnim(deltaTime);
  renderer.render();

  frameCount++;
  fpsTimer += deltaTime;
  if (fpsTimer >= 1000) {
    fps = frameCount;
    frameCount = 0;
    fpsTimer = 0;
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

(window as any).getDebugInfo = () => {
  return {
    fps,
    coins: engine.coins,
    buildings: engine.buildings.length,
    visitors: engine.visitors.length,
    particles: engine.particles.length
  };
};
