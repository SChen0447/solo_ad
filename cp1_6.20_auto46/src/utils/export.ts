import { PixelFrame, CANVAS_SIZE } from '../store/pixelStore';

export interface ExportJSON {
  version: string;
  metadata: {
    title: string;
    author: string;
    createdAt: number;
    frameCount: number;
    canvasSize: number;
  };
  frames: {
    id: string;
    delay: number;
    pixels: string[];
  }[];
}

export function exportToJSON(
  frames: PixelFrame[],
  title: string = '未命名作品',
  author: string = '匿名'
): string {
  const data: ExportJSON = {
    version: '1.0.0',
    metadata: {
      title,
      author,
      createdAt: Date.now(),
      frameCount: frames.length,
      canvasSize: CANVAS_SIZE,
    },
    frames: frames.map(f => ({
      id: f.id,
      delay: f.delay,
      pixels: f.pixels,
    })),
  };

  return JSON.stringify(data, null, 2);
}

export function downloadJSON(jsonString: string, filename: string = 'pixel-art.json') {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function frameToBlob(frame: PixelFrame, scale: number = 4): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const size = CANVAS_SIZE * scale;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const color = frame.pixels[y * CANVAS_SIZE + x];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

export async function exportToGif(
  frames: PixelFrame[],
  _title: string = '未命名作品'
): Promise<{ blobs: Blob[]; delays: number[] }> {
  const blobs: Blob[] = [];
  const delays: number[] = [];

  for (const frame of frames) {
    const blob = await frameToBlob(frame);
    blobs.push(blob);
    delays.push(frame.delay);
  }

  return { blobs, delays };
}

export async function downloadGifSimulation(
  frames: PixelFrame[],
  title: string = '未命名作品'
): Promise<void> {
  const { blobs } = await exportToGif(frames, title);
  
  if (blobs.length === 0) return;

  const zipFilename = `${title}-frames.zip`;
  
  const canvas = document.createElement('canvas');
  const scale = 4;
  const size = CANVAS_SIZE * scale;
  canvas.width = size;
  canvas.height = size * frames.length;
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const color = frame.pixels[y * CANVAS_SIZE + x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale + i * size, scale, scale);
        }
      }
    }
  }

  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFilename.replace('.zip', '.png');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}

export function importFromJSON(jsonString: string): PixelFrame[] {
  const data: ExportJSON = JSON.parse(jsonString);
  
  if (data.metadata.canvasSize !== CANVAS_SIZE) {
    console.warn(`Canvas size mismatch: expected ${CANVAS_SIZE}, got ${data.metadata.canvasSize}`);
  }

  return data.frames.map(f => ({
    id: f.id,
    delay: f.delay,
    pixels: f.pixels,
  }));
}
