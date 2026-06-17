import { CharacterCustomization } from './types';

export type CharacterPose = 'idle' | 'walk' | 'jump';

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  customization: CharacterCustomization,
  scale: number = 1,
  pose: CharacterPose = 'idle',
  frame: number = 0,
  angle: number = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const bounce = pose === 'jump' ? -8 : pose === 'walk' ? Math.sin(frame * 0.3) * 2 : 0;
  const walkOffset = pose === 'walk' ? Math.sin(frame * 0.3) * 4 : 0;

  drawPants(ctx, customization.pantsColor, walkOffset);
  drawShirt(ctx, customization.shirtColor, bounce);
  drawArms(ctx, customization.skinColor, customization.shirtColor, walkOffset);
  drawHead(ctx, customization.skinColor, bounce);
  drawHair(ctx, customization.hairStyle, customization.hairColor, bounce);
  drawAccessory(ctx, customization.accessoryType, bounce);
  drawGun(ctx, angle);

  ctx.restore();
}

function drawPants(ctx: CanvasRenderingContext2D, color: string, walkOffset: number) {
  ctx.fillStyle = color;
  ctx.fillRect(-10, 0, 8, 20 + walkOffset);
  ctx.fillRect(2, 0, 8, 20 - walkOffset);
  ctx.fillRect(-10, -5, 20, 8);
}

function drawShirt(ctx: CanvasRenderingContext2D, color: string, bounce: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-14, -5 + bounce);
  ctx.lineTo(14, -5 + bounce);
  ctx.lineTo(12, 15 + bounce);
  ctx.lineTo(-12, 15 + bounce);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(-12, -3 + bounce, 6, 12);
}

function drawArms(
  ctx: CanvasRenderingContext2D,
  skinColor: string,
  shirtColor: string,
  walkOffset: number
) {
  ctx.fillStyle = shirtColor;
  ctx.fillRect(-18, -3 + walkOffset, 6, 12);
  ctx.fillRect(12, -3 - walkOffset, 6, 12);

  ctx.fillStyle = skinColor;
  ctx.fillRect(-18, 8 + walkOffset, 6, 6);
  ctx.fillRect(12, 8 - walkOffset, 6, 6);
}

function drawHead(ctx: CanvasRenderingContext2D, skinColor: string, bounce: number) {
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, -18 + bounce, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.fillRect(-5, -20 + bounce, 3, 3);
  ctx.fillRect(2, -20 + bounce, 3, 3);

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -14 + bounce, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function drawHair(ctx: CanvasRenderingContext2D, style: number, color: string, bounce: number) {
  ctx.fillStyle = color;

  switch (style) {
    case 0:
      ctx.beginPath();
      ctx.arc(0, -22 + bounce, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-12, -22 + bounce, 24, 5);
      break;
    case 1:
      ctx.beginPath();
      ctx.arc(0, -22 + bounce, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-13, -22 + bounce, 26, 5);
      ctx.fillRect(-12, -17 + bounce, 4, 15);
      ctx.fillRect(8, -17 + bounce, 4, 15);
      break;
    case 2:
      ctx.fillRect(-3, -30 + bounce, 6, 12);
      ctx.beginPath();
      ctx.arc(0, -22 + bounce, 10, Math.PI, 0);
      ctx.fill();
      break;
    case 3:
      ctx.beginPath();
      ctx.arc(0, -22 + bounce, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-12, -22 + bounce, 10, 5);
      ctx.fillRect(2, -22 + bounce, 10, 5);
      ctx.fillStyle = skinColor || '#f5cba7';
      ctx.fillRect(-1, -22 + bounce, 2, 3);
      break;
    case 4:
      break;
  }
}

function drawAccessory(ctx: CanvasRenderingContext2D, type: number, bounce: number) {
  switch (type) {
    case 1:
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-5, -20 + bounce, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(5, -20 + bounce, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -20 + bounce);
      ctx.lineTo(-1, -20 + bounce);
      ctx.stroke();
      break;
    case 2:
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(0, -26 + bounce, 14, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-16, -26 + bounce, 32, 3);
      break;
    case 3:
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(-12, -18 + bounce, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(12, -18 + bounce, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -22 + bounce, 12, Math.PI, 0);
      ctx.stroke();
      break;
    case 4:
      ctx.fillStyle = '#555';
      ctx.fillRect(-8, -14 + bounce, 16, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-6, -12 + bounce, 12, 4);
      break;
  }
}

function drawGun(ctx: CanvasRenderingContext2D, angle: number) {
  ctx.save();
  ctx.translate(12, 5);
  ctx.rotate(angle);
  ctx.fillStyle = '#444';
  ctx.fillRect(0, -3, 20, 6);
  ctx.fillStyle = '#333';
  ctx.fillRect(2, -2, 5, 4);
  ctx.fillStyle = '#555';
  ctx.fillRect(16, -2, 4, 4);
  ctx.restore();
}
