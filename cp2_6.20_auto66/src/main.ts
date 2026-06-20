import { Engine } from './game/engine';
import { Editor } from './editor/editor';
import { PlayerForm } from './game/player';

const PANEL_WIDTH = 280;
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d')!;

canvas.style.display = 'block';
canvas.style.background = '#1A1A2E';
document.body.appendChild(canvas);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gameAreaWidth = canvas.width - PANEL_WIDTH;
const gameAreaHeight = canvas.height;

const engine = new Engine(canvas, gameAreaWidth, gameAreaHeight);
const editor = new Editor(engine);

const defaultLevel = editor.createDefaultLevel();
engine.loadLevel(defaultLevel);

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const newAreaWidth = canvas.width - PANEL_WIDTH;
  const newAreaHeight = canvas.height;
  engine.areaWidth = newAreaWidth;
  engine.areaHeight = newAreaHeight;
  editor.uiPanel.updateLayout(newAreaWidth, newAreaHeight);
}

window.addEventListener('resize', resize);

const keys = new Set<string>();
let gameTime = 0;
let lastTimestamp = performance.now();

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);

  if (key === ' ' && engine.mode === 'play') {
    e.preventDefault();
    engine.player.switchForm();
  }

  if (key === 'escape' && engine.mode === 'play') {
    editor.stopTest();
  }
});

document.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  editor.handleMouseMove(x, y);
  updateCursor(x);
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  editor.handleCanvasClick(x, y);
});

function updateCursor(canvasX: number): void {
  if (engine.mode === 'play') {
    const form = engine.player.form;
    if (form === PlayerForm.Light) {
      canvas.style.cursor = 'url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22><circle cx=%228%22 cy=%228%22 r=%226%22 fill=%22%23FFD700%22/></svg>") 8 8, auto';
    } else {
      canvas.style.cursor = 'url("data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22><circle cx=%228%22 cy=%228%22 r=%226%22 fill=%22%234A0080%22/></svg>") 8 8, auto';
    }
  } else {
    canvas.style.cursor = 'crosshair';
  }
}

function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 1 / 15);
  lastTimestamp = timestamp;
  gameTime += dt;

  engine.keys = keys;

  if (engine.mode === 'play') {
    engine.update(dt);
  }

  editor.update(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  engine.render();
  editor.render(ctx, gameTime);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
