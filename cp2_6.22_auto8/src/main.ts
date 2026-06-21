import { WeaponSystem } from './system';
import { Renderer } from './render';
import { InputManager } from './input';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const system = new WeaponSystem();
const renderer = new Renderer(canvas);
const input = new InputManager(canvas);

let lastTime = performance.now();
let fireRequested = false;

canvas.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button === 0) {
    fireRequested = true;
  }
});

canvas.addEventListener('mouseup', (e: MouseEvent) => {
  if (e.button === 0) {
    fireRequested = false;
  }
});

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  const inputState = input.getState();

  const weaponIdx = input.consumeWeaponSwitch();
  if (weaponIdx !== null) {
    system.switchWeapon(weaponIdx);
  }

  system.updateMechaAngle(inputState.mouseX, inputState.mouseY);

  if (fireRequested && system.currentWeapon.canFire()) {
    system.fire(inputState.mouseX, inputState.mouseY);
  }

  system.update(dt);

  const renderData = system.getRenderData();
  renderer.render(renderData, inputState.mouseX, inputState.mouseY);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
