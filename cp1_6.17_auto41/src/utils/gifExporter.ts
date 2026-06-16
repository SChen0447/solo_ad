import GIF from 'gif.js';
import type { PixelFrame } from '../types';
import { CANVAS_SIZE, SCALE_FACTOR } from '../types';
import { drawPixelFrame } from './canvasUtils';

export interface ExportOptions {
  frames: PixelFrame[];
  fps: number;
  scale?: number;
  onProgress?: (progress: number) => void;
}

const createFrameCanvas = (
  frame: PixelFrame,
  scale: number
): HTMLCanvasElement => {
  const size = CANVAS_SIZE * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  drawPixelFrame(ctx, frame, scale);

  return canvas;
};

export const exportToGif = async ({
  frames, fps, scale = 4, onProgress }: ExportOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const delay = Math.round(1000 / fps);

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: CANVAS_SIZE * scale,
      height: CANVAS_SIZE * scale,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
    });

    frames.forEach((frame) => {
      const canvas = createFrameCanvas(frame, scale);
      gif.addFrame(canvas, { delay });
    });

    gif.on('progress', (p: number) => {
      onProgress?.(p);
    });

    gif.on('finished', (blob: Blob) => {
      resolve(blob);
    });

    gif.on('error', (error: Error) => {
      reject(error);
    });

    gif.render();
  });
};

export const downloadGif = async (
  options: ExportOptions,
  filename: string = 'pixel-animation.gif'
): Promise<void> => {
  const blob = await exportToGif(options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
