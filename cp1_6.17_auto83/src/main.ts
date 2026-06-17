import { Emitter, EmitterConfig } from './emitter';
import { UIController } from './controller';
import { EffectType } from './particle';

const app = document.getElementById('app') as HTMLElement;
if (!app) {
  throw new Error('Container #app not found');
}

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;

function resizeCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
app.appendChild(canvas);

const defaultConfig: EmitterConfig = {
  maxParticles: 1000,
  particleSize: 6,
  emissionRate: 80,
  trailLength: 20,
  windStrength: 10,
  windDirection: 0
};

const emitter = new Emitter(defaultConfig);
const ui = new UIController(app, emitter);

const keyEffectMap: Record<string, EffectType> = {
  'q': 'fire',
  'w': 'ice',
  'e': 'lightning',
  'r': 'heal'
};

const pressedKeys = new Set<string>();

function updateMousePos(clientX: number, clientY: number): void {
  emitter.mouseX = clientX;
  emitter.mouseY = clientY;
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    emitter.isMouseDown = true;
    updateMousePos(e.clientX, e.clientY);
  }
});

canvas.addEventListener('mousemove', (e) => {
  updateMousePos(e.clientX, e.clientY);
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    emitter.isMouseDown = false;
  }
});

canvas.addEventListener('mouseleave', () => {
  emitter.isMouseDown = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (pressedKeys.has(key)) return;
  pressedKeys.add(key);

  if (keyEffectMap[key]) {
    emitter.activateEffect(keyEffectMap[key]);
    ui.updateEffectDisplay();
  }

  if (key === 'a') {
    const newDir = (emitter.windDirection - 15 + 360) % 360;
    emitter.setConfig({ windDirection: newDir });
    ui.updateWindDirectionSlider();
  }
  if (key === 'd') {
    const newDir = (emitter.windDirection + 15) % 360;
    emitter.setConfig({ windDirection: newDir });
    ui.updateWindDirectionSlider();
  }
  if (key === 's') {
    emitter.setConfig({ windStrength: 0 });
    const slider = document.getElementById('slider-windStrength') as HTMLInputElement | null;
    if (slider) {
      slider.value = '0';
      slider.dispatchEvent(new Event('input'));
    }
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  pressedKeys.delete(key);

  if (keyEffectMap[key]) {
    emitter.deactivateEffect(keyEffectMap[key]);
    ui.updateEffectDisplay();
  }
});

let lastTime = performance.now();
let frameCount = 0;
let fpsAccumulator = 0;
let currentFPS = 60;

function drawBackground(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0a15');
  grad.addColorStop(0.5, '#0d0d1a');
  grad.addColorStop(1, '#06060c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function gameLoop(timestamp: number): void {
  let dt = timestamp - lastTime;
  lastTime = timestamp;
  if (dt > 50) dt = 50;

  frameCount++;
  fpsAccumulator += dt;
  if (fpsAccumulator >= 500) {
    currentFPS = Math.round((frameCount / fpsAccumulator) * 1000);
    frameCount = 0;
    fpsAccumulator = 0;
    ui.updateFPS(currentFPS);
  }

  emitter.update(dt);

  drawBackground();
  emitter.draw(ctx);

  requestAnimationFrame(gameLoop);
}

emitter.mouseX = window.innerWidth / 2;
emitter.mouseY = window.innerHeight / 2;
emitter.isMouseDown = false;

requestAnimationFrame(gameLoop);
