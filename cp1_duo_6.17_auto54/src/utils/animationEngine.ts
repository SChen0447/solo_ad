export type PixelData = (string | null)[][];

export interface Frame {
  id: string;
  pixels: PixelData;
  delay: number;
}

export type ToolType = 'pencil' | 'eraser' | 'fill' | 'picker';
export type BrushSize = 1 | 2 | 3;
export type GridSize = 16 | 32;

export interface PalettePreset {
  name: string;
  colors: string[];
}

export const PRESET_PALETTES: PalettePreset[] = [
  {
    name: '红白机',
    colors: ['#000000', '#ffffff', '#f83800', '#a0e8e8', '#bcbcfc', '#58f898', '#f8b8f8', '#f8d878']
  },
  {
    name: 'GameBoy',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f', '#556b2f', '#3a5a40', '#a3b18a', '#dad7cd']
  },
  {
    name: 'PC-98',
    colors: ['#000000', '#ffffff', '#ff4500', '#00ced1', '#da70d6', '#98fb98', '#ff69b4', '#ffd700']
  },
  {
    name: '超任',
    colors: ['#000000', '#ffffff', '#c41e3a', '#00bfff', '#9932cc', '#32cd32', '#ff1493', '#ffa500']
  }
];

export function createEmptyPixels(gridSize: GridSize): PixelData {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => null)
  );
}

export function clonePixels(pixels: PixelData): PixelData {
  return pixels.map(row => [...row]);
}

export function generateFrameId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function floodFill(
  pixels: PixelData,
  startX: number,
  startY: number,
  newColor: string | null
): PixelData {
  const rows = pixels.length;
  const cols = pixels[0].length;
  const targetColor = pixels[startY][startX];

  if (targetColor === newColor) return pixels;

  const result = clonePixels(pixels);
  const stack: [number, number][] = [[startX, startY]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
    if (result[y][x] !== targetColor) continue;

    result[y][x] = newColor;

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  return result;
}

export function drawBrush(
  pixels: PixelData,
  cx: number,
  cy: number,
  color: string | null,
  size: BrushSize
): PixelData {
  const result = clonePixels(pixels);
  const rows = pixels.length;
  const cols = pixels[0].length;

  const half = Math.floor(size / 2);
  for (let dy = -half; dy <= size - half - 1; dy++) {
    for (let dx = -half; dx <= size - half - 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        result[y][x] = color;
      }
    }
  }
  return result;
}

export function drawLine(
  pixels: PixelData,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string | null,
  size: BrushSize
): PixelData {
  const rows = pixels.length;
  const cols = pixels[0].length;

  const toPaint = new Set<string>();
  const half = Math.floor(size / 2);

  const addBrushPixels = (cx: number, cy: number) => {
    for (let dy = -half; dy <= size - half - 1; dy++) {
      for (let dx = -half; dx <= size - half - 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          toPaint.add(`${x},${y}`);
        }
      }
    }
  };

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;
  let safety = 0;
  const maxSteps = dx + dy + 2;

  while (safety < maxSteps) {
    safety++;
    addBrushPixels(x, y);

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  if (toPaint.size === 0) return pixels;

  const result = clonePixels(pixels);
  toPaint.forEach((key) => {
    const [pxStr, pyStr] = key.split(',');
    const px = parseInt(pxStr, 10);
    const py = parseInt(pyStr, 10);
    result[py][px] = color;
  });

  return result;
}

export function getMostSaturatedColor(colors: string[]): string {
  let maxSat = -1;
  let result = colors[0];

  for (const color of colors) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let sat = 0;
    if (max !== min) {
      sat = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    }

    if (sat > maxSat) {
      maxSat = sat;
      result = color;
    }
  }
  return result;
}

export class AnimationEngine {
  private frames: Frame[] = [];
  private currentFrameIndex = 0;
  private isPlaying = false;
  private playbackSpeed = 1;
  private frameDuration = 100;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private onFrameChange: (index: number) => void = () => {};

  constructor(onFrameChange: (index: number) => void) {
    this.onFrameChange = onFrameChange;
  }

  setFrames(frames: Frame[]): void {
    this.frames = frames;
    if (this.currentFrameIndex >= frames.length) {
      this.currentFrameIndex = Math.max(0, frames.length - 1);
    }
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(1, Math.min(6, speed));
  }

  getCurrentIndex(): number {
    return this.currentFrameIndex;
  }

  setCurrentIndex(index: number): void {
    if (this.frames.length === 0) return;
    this.currentFrameIndex = ((index % this.frames.length) + this.frames.length) % this.frames.length;
    this.onFrameChange(this.currentFrameIndex);
  }

  nextFrame(): void {
    this.setCurrentIndex(this.currentFrameIndex + 1);
  }

  prevFrame(): void {
    this.setCurrentIndex(this.currentFrameIndex - 1);
  }

  start(): void {
    if (this.isPlaying || this.frames.length < 2) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private loop = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    const adjustedDuration = this.frameDuration / this.playbackSpeed;

    if (elapsed >= adjustedDuration) {
      this.nextFrame();
      this.lastFrameTime = now;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    this.stop();
  }
}
