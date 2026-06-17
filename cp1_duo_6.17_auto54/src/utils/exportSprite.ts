import type { Frame, PixelData, GridSize } from './animationEngine';
import GIF from 'gif.js';

export function renderFrameToCanvas(
  pixels: PixelData,
  gridSize: GridSize,
  cellSize: number = 1,
  onionPrev?: PixelData | null,
  onionNext?: PixelData | null,
  prevOpacity: number = 0,
  nextOpacity: number = 0
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = gridSize * cellSize;
  canvas.height = gridSize * cellSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (onionPrev && prevOpacity > 0) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (onionPrev[y][x]) {
          ctx.fillStyle = applyAlpha(onionPrev[y][x]!, prevOpacity, 'red');
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  if (onionNext && nextOpacity > 0) {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (onionNext[y][x]) {
          ctx.fillStyle = applyAlpha(onionNext[y][x]!, nextOpacity, 'blue');
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (pixels[y][x]) {
        ctx.fillStyle = pixels[y][x]!;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  return canvas;
}

function applyAlpha(hex: string, opacity: number, tint: 'red' | 'blue'): string {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const alpha = Math.max(0, Math.min(0.5, opacity / 100));

  let tr = r, tg = g, tb = b;
  if (tint === 'red') {
    tr = Math.min(255, r + 80);
    tg = Math.max(0, g - 40);
    tb = Math.max(0, b - 40);
  } else {
    tr = Math.max(0, r - 40);
    tg = Math.max(0, g - 40);
    tb = Math.min(255, b + 80);
  }

  return `rgba(${tr}, ${tg}, ${tb}, ${alpha})`;
}

export function exportSpritesheet(
  frames: Frame[],
  gridSize: GridSize,
  fileName: string = 'spritesheet.png'
): void {
  const COLUMNS = 4;
  const PADDING = 1;
  const cellSize = gridSize;

  const rows = Math.ceil(frames.length / COLUMNS);
  const width = COLUMNS * cellSize + (COLUMNS + 1) * PADDING;
  const height = rows * cellSize + (rows + 1) * PADDING;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < frames.length; i++) {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const x = PADDING + col * (cellSize + PADDING);
    const y = PADDING + row * (cellSize + PADDING);

    const frameCanvas = renderFrameToCanvas(frames[i].pixels, gridSize, 1);
    ctx.drawImage(frameCanvas, x, y);
  }

  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, fileName);
    }
  }, 'image/png');
}

export async function exportGif(
  frames: Frame[],
  gridSize: GridSize,
  playbackSpeed: number,
  fileName: string = 'animation.gif'
): Promise<void> {
  const workerUrl = await getGifWorker();

  return new Promise((resolve) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: gridSize,
      height: gridSize,
      workerScript: workerUrl
    });

    const frameDelay = Math.max(20, Math.round(100 / playbackSpeed));

    for (const frame of frames) {
      const canvas = renderFrameToCanvas(frame.pixels, gridSize, 1);
      gif.addFrame(canvas, { delay: frameDelay });
    }

    gif.on('finished', (blob: Blob) => {
      downloadBlob(blob, fileName);
      resolve();
    });

    gif.render();
  });
}

async function getGifWorker(): Promise<string> {
  try {
    const response = await fetch('/gif.worker.js');
    if (response.ok) {
      const text = await response.text();
      const blob = new Blob([text], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
    }
  } catch {
  }
  return 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js';
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function generateThumbnail(
  pixels: PixelData,
  gridSize: GridSize,
  size: number = 60
): string {
  const cellSize = Math.floor(size / gridSize);
  const canvas = renderFrameToCanvas(pixels, gridSize, cellSize);
  return canvas.toDataURL('image/png');
}
