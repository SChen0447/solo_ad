import html2canvas from 'html2canvas';
import GIF from 'gif.js';
import { redrawCanvas, type Stroke } from './canvasEngine';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAsPng(canvas: HTMLCanvasElement): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            triggerDownload(blob, `sketch-${ts}.png`);
            resolve();
          } else {
            reject(new Error('PNG 导出失败'));
          }
        },
        'image/png'
      );
    } catch (e) {
      reject(e);
    }
  });
}

export async function exportAsJpg(canvas: HTMLCanvasElement): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            triggerDownload(blob, `sketch-${ts}.jpg`);
            resolve();
          } else {
            reject(new Error('JPG 导出失败'));
          }
        },
        'image/jpeg',
        0.95
      );
    } catch (e) {
      reject(e);
    }
  });
}

export interface GifOptions {
  frameDelay: number;
  loopCount: number;
  onProgress?: (progress: number) => void;
}

export async function exportAsGif(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  options: GifOptions
): Promise<void> {
  const { frameDelay, loopCount, onProgress } = options;
  const width = canvas.width;
  const height = canvas.height;

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width,
    height,
    workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
    repeat: loopCount === 0 ? 0 : loopCount - 1,
  });

  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d')!;

  const delayMs = Math.max(100, Math.floor(frameDelay * 1000));
  const totalFrames = Math.max(1, strokes.length);

  if (strokes.length === 0) {
    redrawCanvas(offCtx, [], width, height);
    gif.addFrame(offCtx, { copy: true, delay: delayMs });
  } else {
    for (let i = 0; i <= strokes.length; i++) {
      redrawCanvas(offCtx, strokes, width, height, i);
      gif.addFrame(offCtx, { copy: true, delay: delayMs });
      if (onProgress) onProgress((i / (strokes.length + 1)) * 0.6);
    }
  }

  return new Promise((resolve, reject) => {
    gif.on('progress', (p: number) => {
      if (onProgress) onProgress(0.6 + p * 0.4);
    });

    gif.on('finished', (blob: Blob) => {
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      triggerDownload(blob, `sketch-${ts}.gif`);
      if (onProgress) onProgress(1);
      resolve();
    });

    gif.on('error', (err: Error) => reject(err));

    try {
      gif.render();
    } catch (e) {
      reject(e);
    }
  });
}
