import { Pet, PetAttributes } from './pet';
import { Renderer } from './renderer';
import { initUI } from './ui';

const STATE_MACHINE_INTERVAL = 1000;
const RENDER_FPS = 24;
const RENDER_INTERVAL = 1000 / RENDER_FPS;

function valueToColor(value: number): string {
  if (value <= 20) return '#FF0000';
  if (value >= 80) return '#00FF00';
  const t = (value - 20) / 60;
  const r = Math.round(255 - t * 255);
  const g = Math.round(t * 255);
  const b = 0;
  return `rgb(${r},${g},${b})`;
}

const ATTR_KEYS: (keyof PetAttributes)[] = ['hunger', 'happiness', 'energy', 'health'];

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
  ATTR_KEYS.forEach((key) => {
    const value = attrs[key];
    const bar = document.querySelector<HTMLElement>(`[data-stat="${key}"]`);
    const valSpan = document.querySelector<HTMLElement>(`[data-stat-value="${key}"]`);
    if (bar) {
      bar.style.width = `${value}%`;
      bar.style.backgroundColor = valueToColor(value);
    }
    if (valSpan) {
      valSpan.textContent = String(Math.round(value));
    }
  });
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
lastStateTick = performance.now();
requestAnimationFrame(gameLoop);
