import type { PixelColor, PixelGrid } from '../types';

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D context');
  return ctx;
}

export function colorToString(color: PixelColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
}

export function colorsEqual(a: PixelColor | null, b: PixelColor | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function gridToCanvas(grid: PixelGrid): HTMLCanvasElement {
  const height = grid.length;
  const width = grid[0].length;
  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);
  
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = grid[y][x];
      const idx = (y * width + x) * 4;
      
      if (pixel) {
        data[idx] = pixel.r;
        data[idx + 1] = pixel.g;
        data[idx + 2] = pixel.b;
        data[idx + 3] = pixel.a;
      } else {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function drawCheckerboardBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number = 8,
  color1: string = '#2a2a2a',
  color2: string = '#3a3a3a'
): void {
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isEven = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0;
      ctx.fillStyle = isEven ? color1 : color2;
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }
}

export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  grid: PixelGrid,
  scale: number,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  const height = grid.length;
  const width = grid[0].length;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = grid[y][x];
      if (pixel) {
        ctx.fillStyle = colorToString(pixel);
        ctx.fillRect(
          offsetX + x * scale,
          offsetY + y * scale,
          scale,
          scale
        );
      }
    }
  }
}

export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  color: string = 'rgba(255, 255, 255, 0.1)',
  lineWidth: number = 1
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  
  for (let x = 0; x <= width; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  
  for (let y = 0; y <= height; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
}

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string = '#ffffff'
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.moveTo(x - size / 2, y + 0.5);
  ctx.lineTo(x + size / 2, y + 0.5);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y - size / 2);
  ctx.lineTo(x + 0.5, y + size / 2);
  ctx.stroke();
}

export function getPixelFromCanvas(
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): PixelColor | null {
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return null;
  }
  
  const ctx = getContext(canvas);
  const imageData = ctx.getImageData(x, y, 1, 1);
  const data = imageData.data;
  
  if (data[3] === 0) return null;
  
  return {
    r: data[0],
    g: data[1],
    b: data[2],
    a: data[3],
  };
}

export function drawPixelHighlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number
): void {
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}
