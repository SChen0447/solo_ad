import GIF from 'gif.js';
import {
  CharacterAction,
  Track,
  PixelFrame,
  STAGE_WIDTH,
  STAGE_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';
import { drawFrameToCanvas, getFrameAtPosition, getTotalFrames } from './frameEngine';

export interface ExportOptions {
  fps: 8 | 12 | 24;
  loop: number;
  scale?: number;
  onProgress?: (progress: number) => void;
}

const renderFrameToCanvas = (
  ctx: CanvasRenderingContext2D,
  frames: PixelFrame[],
  scale: number
): void => {
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const spacing = 100;
  const startX = (STAGE_WIDTH - (frames.length - 1) * spacing - CANVAS_WIDTH * scale) / 2;
  const startY = (STAGE_HEIGHT - CANVAS_HEIGHT * scale) / 2;

  frames.forEach((frame, index) => {
    drawFrameToCanvas(
      ctx,
      frame,
      startX + index * spacing,
      startY,
      scale
    );
  });
};

const getFramesForGlobalFrame = (
  globalFrame: number,
  actions: CharacterAction[],
  tracks: Track[]
): PixelFrame[] => {
  const frames: PixelFrame[] = [];
  const actionMap = new Map(actions.map((a) => [a.id, a]));

  for (const track of tracks) {
    for (const clip of track.clips) {
      const action = actionMap.get(clip.actionId);
      if (!action) continue;

      const frame = getFrameAtPosition(clip, action, globalFrame);
      if (frame) {
        frames.push(frame);
      }
    }
  }

  return frames;
};

export const exportToGif = async (
  actions: CharacterAction[],
  tracks: Track[],
  options: ExportOptions
): Promise<Blob | null> => {
  const { fps, loop, scale = 4, onProgress } = options;

  const totalFrames = Math.max(getTotalFrames(tracks), 1);
  if (totalFrames === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = STAGE_WIDTH;
  canvas.height = STAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    workerScript: 'https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js',
    repeat: loop === 0 ? 0 : -1,
  });

  const delay = 1000 / fps;

  for (let i = 0; i < totalFrames; i++) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const frames = getFramesForGlobalFrame(i, actions, tracks);
    renderFrameToCanvas(ctx, frames, scale);
    gif.addFrame(ctx, { copy: true, delay });

    if (onProgress) {
      onProgress((i + 1) / totalFrames);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return new Promise((resolve) => {
    gif.on('finished', (blob: Blob) => {
      resolve(blob);
    });

    gif.on('progress', (progress: number) => {
      if (onProgress) {
        onProgress(0.5 + progress * 0.5);
      }
    });

    gif.render();
  });
};

export const downloadGif = async (
  actions: CharacterAction[],
  tracks: Track[],
  filename: string,
  options: ExportOptions
): Promise<boolean> => {
  const blob = await exportToGif(actions, tracks, options);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename || 'pixel-animation'}.gif`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
};
