import { Pet } from './pet';
import { Renderer } from './renderer';
import { initUI } from './ui';

const STATE_MACHINE_INTERVAL = 1000;
const RENDER_FPS = 24;
const RENDER_INTERVAL = 1000 / RENDER_FPS;

const canvas = document.getElementById('screen') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #screen not found');
}

const pet = new Pet();
const renderer = new Renderer(canvas);

const stateLabel = document.getElementById('state-label');

pet.onStateChange((_state, label, opacity) => {
  if (stateLabel) {
    stateLabel.textContent = `状态: ${label}`;
    stateLabel.style.opacity = String(opacity);
  }
});

pet.onAttributeChange((attrs) => {
  renderer.updateAttributes(attrs);
});

pet.onNotification(() => {});

initUI(pet);

let lastStateTick = performance.now();
let lastRenderTime = 0;
let lastFadeUpdate = 0;

function gameLoop(now: number): void {
  if (now - lastStateTick >= STATE_MACHINE_INTERVAL) {
    const dt = now - lastStateTick;
    lastStateTick = now;
    pet.tick(dt);
    pet.cleanupNotifications();
  }

  if (now - lastFadeUpdate >= 16) {
    const fadeDt = now - lastFadeUpdate;
    lastFadeUpdate = now;
    pet.updateFade(fadeDt);
  }

  if (now - lastRenderTime >= RENDER_INTERVAL) {
    lastRenderTime = now;
    renderer.render(pet, now);
  }

  requestAnimationFrame(gameLoop);
}

lastFadeUpdate = performance.now();
requestAnimationFrame(gameLoop);
