import { GameLoop } from './GameLoop';
import { Player } from './Player';
import { PulseManager } from './PulseManager';
import { Scene } from './Scene';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const scene = new Scene(WIDTH, HEIGHT);
const player = new Player(WIDTH, HEIGHT);
const pulseManager = new PulseManager(WIDTH, HEIGHT, scene, player);

let winCount = 0;

player.setFireCallback((evt) => {
  pulseManager.firePulse(evt.x, evt.y, evt.vx, evt.vy);
});

pulseManager.setOnReceiverHit(() => {
  winCount++;
});

window.addEventListener('keydown', (e) => {
  if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    player.handleKeyDown(e.key);
  }
});

window.addEventListener('keyup', (e) => {
  player.handleKeyUp(e.key);
});

function drawUI(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 15, 26, 0.7)';
  ctx.beginPath();
  const pad = 10;
  const barH = 48;
  this_roundRect(ctx, pad, pad, WIDTH - pad * 2, barH, 8);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 191, 255, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`通关次数: ${winCount}`, 24, 34);
  ctx.fillStyle = '#00bfff';
  ctx.fillText(`能量: ${Math.floor(player.getEnergy())}%`, 170, 34);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 191, 255, 0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '14px "Segoe UI", Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText('WASD移动 | 空格发射', WIDTH - 24, 34);
  ctx.restore();
}

function this_roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function update(dt: number): void {
  scene.update(dt);
  player.update(dt, scene.getObstacles());
  pulseManager.update(dt);
}

function draw(ctx: CanvasRenderingContext2D): void {
  scene.draw(ctx);
  pulseManager.draw(ctx);
  player.draw(ctx);
  drawUI(ctx);
}

const gameLoop = new GameLoop(ctx, update, draw);
gameLoop.start();
