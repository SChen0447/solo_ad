import type { CardElementUnion, BackgroundType } from '@/types';
import { CanvasRenderer } from '@/core/CanvasRenderer';

export function exportToPNG(canvas: HTMLCanvasElement): void {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `greeting-card-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  elements: CardElementUnion[],
  background: string,
  backgroundType: BackgroundType
): void {
  const renderer = new CanvasRenderer(canvas);
  renderer.render(elements, background, backgroundType, null);
}

export async function generateShortLink(cardData: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const hash = btoa(cardData).slice(0, 8).replace(/[+/=]/g, '');
  return `https://card.share/${hash}`;
}

export function serializeCardState(
  elements: CardElementUnion[],
  background: string,
  backgroundType: BackgroundType
): string {
  return JSON.stringify({ elements, background, backgroundType });
}

function lzwEncode(indices: number[], minCodeSize: number): number[] {
  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let dict = new Map<string, number>();

  const resetDict = () => {
    dict = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) {
      dict.set(String.fromCharCode(i), i);
    }
    nextCode = eoiCode + 1;
    codeSize = minCodeSize + 1;
  };

  const writeCode = (code: number) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  resetDict();
  writeCode(clearCode);

  let w = String.fromCharCode(indices[0]);
  for (let i = 1; i < indices.length; i++) {
    const c = String.fromCharCode(indices[i]);
    const wc = w + c;
    if (dict.has(wc)) {
      w = wc;
    } else {
      writeCode(dict.get(w)!);
      if (nextCode < 4096) {
        dict.set(wc, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        writeCode(clearCode);
        resetDict();
      }
      w = c;
    }
  }
  writeCode(dict.get(w)!);
  writeCode(eoiCode);

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return output;
}

function quantizeTo256Colors(imageData: ImageData): { pixels: number[]; palette: number[] } {
  const data = imageData.data;
  const pixelCount = data.length / 4;
  const colorMap = new Map<number, number>();
  const palette: number[] = [];
  const pixels: number[] = new Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const rgb = (r << 16) | (g << 8) | b;

    let idx = colorMap.get(rgb);
    if (idx === undefined) {
      if (palette.length < 256) {
        idx = palette.length;
        colorMap.set(rgb, idx);
        palette.push(rgb);
      } else {
        let minDist = Infinity;
        let nearest = 0;
        for (let p = 0; p < palette.length; p++) {
          const pr = (palette[p] >> 16) & 0xff;
          const pg = (palette[p] >> 8) & 0xff;
          const pb = palette[p] & 0xff;
          const dr = r - pr;
          const dg = g - pg;
          const db = b - pb;
          const dist = dr * dr + dg * dg + db * db;
          if (dist < minDist) {
            minDist = dist;
            nearest = p;
          }
        }
        idx = nearest;
      }
    }
    pixels[i] = idx;
  }

  while (palette.length < 2) {
    palette.push(0);
  }
  while (palette.length < 256) {
    palette.push(0);
  }

  return { pixels, palette };
}

export interface GIFFrameOptions {
  delayMs: number;
}

export async function exportToGIF(
  frames: ImageData[],
  width: number,
  height: number,
  options: GIFFrameOptions = { delayMs: 100 }
): Promise<void> {
  const delay = Math.round(options.delayMs / 10);
  const bytes: number[] = [];

  const pushBytes = (arr: number[]) => {
    for (const b of arr) bytes.push(b);
  };

  const pushString = (s: string) => {
    for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
  };

  pushString('GIF89a');

  const firstFrame = frames[0];
  const { pixels: firstPixels, palette } = quantizeTo256Colors(firstFrame);

  pushBytes([
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0xf7,
    0,
    0,
  ]);

  for (const color of palette) {
    pushBytes([
      (color >> 16) & 0xff,
      (color >> 8) & 0xff,
      color & 0xff,
    ]);
  }

  pushBytes([0x21, 0xff, 0x0b]);
  pushString('NETSCAPE2.0');
  pushBytes([0x03, 0x01, 0x00, 0x00, 0x00]);

  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    let framePixels: number[];
    if (f === 0) {
      framePixels = firstPixels;
    } else {
      const result = quantizeTo256Colors(frame);
      const remapped: number[] = [];
      for (const pidx of result.pixels) {
        const srcRgb = result.palette[pidx];
        let bestIdx = 0;
        let bestDist = Infinity;
        const sr = (srcRgb >> 16) & 0xff;
        const sg = (srcRgb >> 8) & 0xff;
        const sb = srcRgb & 0xff;
        for (let pp = 0; pp < palette.length; pp++) {
          const pr = (palette[pp] >> 16) & 0xff;
          const pg = (palette[pp] >> 8) & 0xff;
          const pb = palette[pp] & 0xff;
          const dr = sr - pr;
          const dg = sg - pg;
          const db = sb - pb;
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = pp;
          }
        }
        remapped.push(bestIdx);
      }
      framePixels = remapped;
    }

    pushBytes([
      0x21, 0xf9, 0x04,
      0x04,
      delay & 0xff, (delay >> 8) & 0xff,
      0,
      0,
    ]);

    pushBytes([0x2c]);
    pushBytes([0, 0, 0, 0]);
    pushBytes([width & 0xff, (width >> 8) & 0xff]);
    pushBytes([height & 0xff, (height >> 8) & 0xff]);
    pushBytes([0]);

    const minCodeSize = 8;
    pushBytes([minCodeSize]);

    const lzwData = lzwEncode(framePixels, minCodeSize);

    let offset = 0;
    while (offset < lzwData.length) {
      const chunkSize = Math.min(255, lzwData.length - offset);
      bytes.push(chunkSize);
      for (let i = 0; i < chunkSize; i++) {
        bytes.push(lzwData[offset + i]);
      }
      offset += chunkSize;
    }
    pushBytes([0]);
  }

  pushBytes([0x3b]);

  const byteArray = new Uint8Array(bytes);
  const blob = new Blob([byteArray], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `greeting-card-${Date.now()}.gif`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function captureAnimatedFrames(
  renderFrame: (frameIndex: number, totalFrames: number) => void,
  width: number,
  height: number,
  totalFrames: number = 20,
  delayMs: number = 80
): Promise<ImageData[]> {
  const frames: ImageData[] = [];
  const offCanvas = document.createElement('canvas');
  offCanvas.width = width;
  offCanvas.height = height;
  const offCtx = offCanvas.getContext('2d')!;

  for (let i = 0; i < totalFrames; i++) {
    renderFrame(i, totalFrames);
    const srcCanvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (srcCanvas) {
      offCtx.clearRect(0, 0, width, height);
      offCtx.drawImage(srcCanvas, 0, 0, width, height);
      frames.push(offCtx.getImageData(0, 0, width, height));
    }
    await new Promise((r) => setTimeout(r, 16));
  }
  return frames;
}
