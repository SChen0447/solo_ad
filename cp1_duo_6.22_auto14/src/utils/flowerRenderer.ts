import * as Phaser from 'phaser';
import { FlowerData, getColorValue, PetalShape } from './genetics';

export function drawFlower(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  flower: FlowerData
): void {
  const color = Phaser.Display.Color.HexStringToColor(getColorValue(flower.color));
  const centerColor = Phaser.Display.Color.HexStringToColor('#f5d76e');
  
  drawPetals(graphics, x, y, size, flower.shape, color, flower.hasSpots);
  
  graphics.fillStyle(centerColor.color, 1);
  graphics.fillCircle(x, y, size * 0.25);
  
  const darkerCenter = Phaser.Display.Color.Interpolate.ColorWithColor(
    centerColor,
    Phaser.Display.Color.HexStringToColor('#d4a017'),
    100,
    40
  );
  graphics.fillStyle(darkerCenter.color, 0.3);
  graphics.fillCircle(x - size * 0.05, y - size * 0.05, size * 0.12);
}

function drawPetals(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  shape: PetalShape,
  color: Phaser.Display.Color,
  hasSpots: boolean
): void {
  const petalCount = 6;
  const petalLength = size * 0.55;
  const petalWidth = size * 0.35;
  
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const petalX = x + Math.cos(angle) * size * 0.3;
    const petalY = y + Math.sin(angle) * size * 0.3;
    
    drawSinglePetal(graphics, petalX, petalY, petalLength, petalWidth, angle + Math.PI / 2, shape, color);
  }
  
  if (hasSpots) {
    drawSpots(graphics, x, y, size, color);
  }
}

function drawSinglePetal(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  length: number,
  width: number,
  angle: number,
  shape: PetalShape,
  color: Phaser.Display.Color
): void {
  graphics.save();
  graphics.translateCanvas(x, y);
  graphics.rotateCanvas(angle);
  
  const gradientSteps = 5;
  for (let i = 0; i < gradientSteps; i++) {
    const t = i / gradientSteps;
    const lerpedColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      color,
      Phaser.Display.Color.HexStringToColor('#ffffff'),
      100,
      Math.floor(t * 40)
    );
    const alpha = 1 - t * 0.3;
    const stepWidth = width * (1 - t * 0.4);
    const stepLength = length * (1 - t * 0.2);
    
    graphics.fillStyle(lerpedColor.color, alpha);
    
    switch (shape) {
      case 'round':
        drawRoundPetal(graphics, stepLength, stepWidth);
        break;
      case 'pointed':
        drawPointedPetal(graphics, stepLength, stepWidth);
        break;
      case 'heart':
        drawHeartPetal(graphics, stepLength, stepWidth);
        break;
      case 'star':
        drawStarPetal(graphics, stepLength, stepWidth);
        break;
    }
  }
  
  graphics.restore();
}

function drawRoundPetal(graphics: Phaser.GameObjects.Graphics, length: number, width: number): void {
  const radius = width / 2;
  graphics.beginPath();
  graphics.arc(0, -length / 2, radius, 0, Math.PI * 2);
  graphics.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
  graphics.fillPath();
  
  graphics.fillEllipse(0, -length / 4, width * 0.85, length * 0.7);
}

function drawPointedPetal(graphics: Phaser.GameObjects.Graphics, length: number, width: number): void {
  graphics.beginPath();
  graphics.moveTo(0, -length);
  graphics.lineTo(-width / 2, 0);
  graphics.lineTo(-width / 3, width * 0.1);
  graphics.lineTo(width / 3, width * 0.1);
  graphics.lineTo(width / 2, 0);
  graphics.closePath();
  graphics.fillPath();
}

function drawHeartPetal(graphics: Phaser.GameObjects.Graphics, length: number, width: number): void {
  const w = width * 0.9;
  const h = length * 0.85;
  const steps = 12;
  
  graphics.beginPath();
  graphics.moveTo(0, h * 0.15);
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -w / 2 * Math.sin(t * Math.PI);
    const y = -h * 0.5 - h * 0.4 * Math.cos(t * Math.PI);
    graphics.lineTo(x, y);
  }
  
  graphics.lineTo(0, -h * 0.65);
  
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const x = w / 2 * Math.sin(t * Math.PI);
    const y = -h * 0.5 - h * 0.4 * Math.cos(t * Math.PI);
    graphics.lineTo(x, y);
  }
  
  graphics.closePath();
  graphics.fillPath();
}

function drawStarPetal(graphics: Phaser.GameObjects.Graphics, length: number, width: number): void {
  const points = 5;
  const outerRadius = length;
  const innerRadius = width * 0.4;
  
  graphics.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * radius * 0.5;
    const py = Math.sin(angle) * radius;
    
    if (i === 0) {
      graphics.moveTo(px, py);
    } else {
      graphics.lineTo(px, py);
    }
  }
  graphics.closePath();
  graphics.fillPath();
}

function drawSpots(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  color: Phaser.Display.Color
): void {
  const spotColor = Phaser.Display.Color.Interpolate.ColorWithColor(
    color,
    Phaser.Display.Color.HexStringToColor('#8b4513'),
    100,
    30
  );
  graphics.fillStyle(spotColor.color, 0.6);
  
  const petalCount = 6;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const spotX = x + Math.cos(angle) * size * 0.4;
    const spotY = y + Math.sin(angle) * size * 0.4;
    graphics.fillCircle(spotX, spotY, size * 0.06);
  }
}

export function drawHourglass(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number
): void {
  const woodColor = Phaser.Display.Color.HexStringToColor('#8b4513');
  const glassColor = Phaser.Display.Color.HexStringToColor('#add8e6');
  const sandColor = Phaser.Display.Color.HexStringToColor('#f4a460');
  
  graphics.fillStyle(woodColor.color, 1);
  graphics.fillRect(x - size * 0.5, y - size * 0.55, size, size * 0.08);
  graphics.fillRect(x - size * 0.5, y + size * 0.47, size, size * 0.08);
  
  graphics.fillStyle(glassColor.color, 0.3);
  graphics.fillStyle(0xffffff, 0.2);
  
  graphics.beginPath();
  graphics.moveTo(x - size * 0.45, y - size * 0.47);
  graphics.lineTo(x - size * 0.1, y);
  graphics.lineTo(x - size * 0.45, y + size * 0.47);
  graphics.closePath();
  graphics.fillPath();
  
  graphics.beginPath();
  graphics.moveTo(x + size * 0.45, y - size * 0.47);
  graphics.lineTo(x + size * 0.1, y);
  graphics.lineTo(x + size * 0.45, y + size * 0.47);
  graphics.closePath();
  graphics.fillPath();
  
  graphics.fillStyle(sandColor.color, 0.9);
  
  graphics.beginPath();
  graphics.moveTo(x - size * 0.4, y - size * 0.4);
  graphics.lineTo(x - size * 0.12, y - size * 0.1);
  graphics.lineTo(x + size * 0.12, y - size * 0.1);
  graphics.lineTo(x + size * 0.4, y - size * 0.4);
  graphics.closePath();
  graphics.fillPath();
  
  graphics.beginPath();
  graphics.moveTo(x - size * 0.15, y + size * 0.1);
  graphics.lineTo(x - size * 0.35, y + size * 0.4);
  graphics.lineTo(x + size * 0.35, y + size * 0.4);
  graphics.lineTo(x + size * 0.15, y + size * 0.1);
  graphics.closePath();
  graphics.fillPath();
  
  graphics.fillStyle(sandColor.color, 0.7);
  graphics.fillRect(x - size * 0.02, y - size * 0.05, size * 0.04, size * 0.15);
}
