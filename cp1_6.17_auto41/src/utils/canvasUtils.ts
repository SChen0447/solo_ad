import type { PixelFrame, PixelColor } from '../types';
import { CANVAS_SIZE, SCALE_FACTOR } from '../types';

export const drawCheckerboardBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number = 16
): void => {
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isLight = (Math.floor(y / cellSize) + Math.floor(x / cellSize)) % 2 === 0;
      ctx.fillStyle = isLight ? '#3a3a3a' : '#2a2a2a';
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
};

export const drawGridLines = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixelSize: number
): void => {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= width; x += pixelSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += pixelSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

export const drawPixelFrame = (
  ctx: CanvasRenderingContext2D,
  frame: PixelFrame,
  scale: number = SCALE_FACTOR,
  offsetX: number = 0,
  offsetY: number = 0
): void => {
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const pixel = frame[y][x];
      if (pixel.a > 0) {
        ctx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a / 255})`;
        ctx.fillRect(
          offsetX + x * scale,
          offsetY + y * scale,
          scale,
          scale
        );
      }
    }
  }
};

export const drawPixelHighlight = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number = SCALE_FACTOR
): void => {
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x * scale, y * scale, scale, scale);
};

export const frameToImageData = (
  frame: PixelFrame,
  scale: number = 1
): ImageData => {
  const size = CANVAS_SIZE * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  if (scale === 1) {
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const idx = (y * CANVAS_SIZE + x) * 4;
        const pixel = frame[y][x];
        imageData.data[idx] = pixel.r;
        imageData.data[idx + 1] = pixel.g;
        imageData.data[idx + 2] = pixel.b;
        imageData.data[idx + 3] = pixel.a;
      }
    }
    return imageData;
  } else {
    drawPixelFrame(ctx, frame, scale);
    return ctx.getImageData(0, 0, size, size);
  }
};

export const colorToHex = (color: PixelColor): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
};

export const hexToColor = (hex: string, alpha: number = 255): PixelColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: alpha,
      }
    : { r: 0, g: 0, b: 0, a: alpha };
};
