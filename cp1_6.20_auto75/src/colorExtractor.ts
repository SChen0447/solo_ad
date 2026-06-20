import type { ExtractedColor, ColorExtractResult, RGB } from '../types';
import {
  createExtractedColor,
  getBrightness,
  rgbToHsv,
  hexToRgb,
} from '../utils/colorUtils';

class KMeansCluster {
  private k: number;
  private maxIterations: number;

  constructor(k: number = 5, maxIterations: number = 20) {
    this.k = k;
    this.maxIterations = maxIterations;
  }

  private distance(c1: number[], c2: number[]): number {
    let sum = 0;
    for (let i = 0; i < c1.length; i++) {
      const d = c1[i] - c2[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  private initializeCentroids(pixels: number[][]): number[][] {
    const centroids: number[][] = [];
    const used = new Set<number>();
    const len = pixels.length;

    if (len === 0) return centroids;

    centroids.push([...pixels[Math.floor(len / 2)]]);
    used.add(Math.floor(len / 2));

    while (centroids.length < this.k && centroids.length < len) {
      let maxDist = -1;
      let maxIdx = 0;

      for (let i = 0; i < len; i += Math.max(1, Math.floor(len / 1000))) {
        if (used.has(i)) continue;
        let minDist = Infinity;
        for (const c of centroids) {
          const d = this.distance(pixels[i], c);
          if (d < minDist) minDist = d;
        }
        if (minDist > maxDist) {
          maxDist = minDist;
          maxIdx = i;
        }
      }

      centroids.push([...pixels[maxIdx]]);
      used.add(maxIdx);
    }

    return centroids;
  }

  public fit(pixels: number[][]): { centroids: number[][]; counts: number[] } {
    if (pixels.length === 0) {
      return { centroids: [], counts: [] };
    }

    let centroids = this.initializeCentroids(pixels);
    const counts: number[] = new Array(this.k).fill(0);

    for (let iter = 0; iter < this.maxIterations; iter++) {
      const sums: number[][] = centroids.map(() => [0, 0, 0, 0]);
      counts.fill(0);
      let changed = false;

      for (const pixel of pixels) {
        let minIdx = 0;
        let minDist = Infinity;

        for (let i = 0; i < centroids.length; i++) {
          const d = this.distance(pixel, centroids[i]);
          if (d < minDist) {
            minDist = d;
            minIdx = i;
          }
        }

        counts[minIdx]++;
        sums[minIdx][0] += pixel[0];
        sums[minIdx][1] += pixel[1];
        sums[minIdx][2] += pixel[2];
        sums[minIdx][3] += 1;
      }

      for (let i = 0; i < centroids.length; i++) {
        if (sums[i][3] > 0) {
          const newR = Math.round(sums[i][0] / sums[i][3]);
          const newG = Math.round(sums[i][1] / sums[i][3]);
          const newB = Math.round(sums[i][2] / sums[i][3]);
          if (
            centroids[i][0] !== newR ||
            centroids[i][1] !== newG ||
            centroids[i][2] !== newB
          ) {
            centroids[i] = [newR, newG, newB];
            changed = true;
          }
        }
      }

      if (!changed && iter > 3) break;
    }

    return { centroids, counts };
  }
}

function samplePixels(imageData: ImageData, sampleRate: number = 0.02): number[][] {
  const { data, width, height } = imageData;
  const total = width * height;
  const step = Math.max(1, Math.floor(1 / sampleRate));
  const pixels: number[][] = [];

  for (let i = 0; i < total; i += step) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 30) continue;
    if (r < 8 && g < 8 && b < 8) continue;
    if (r > 248 && g > 248 && b > 248) continue;

    pixels.push([r, g, b]);
  }

  return pixels;
}

export function extractColors(
  imageData: ImageData,
  k: number = 5,
  onProgress?: (progress: number) => void,
): ColorExtractResult {
  onProgress?.(0.1);

  const pixels = samplePixels(imageData, 0.015);
  onProgress?.(0.25);

  const kmeans = new KMeansCluster(k, 18);
  const { centroids, counts } = kmeans.fit(pixels);
  onProgress?.(0.85);

  const totalPixels = counts.reduce((a, b) => a + b, 0) || 1;

  const validPairs: { color: number[]; count: number }[] = [];
  for (let i = 0; i < centroids.length; i++) {
    if (counts[i] > 0) {
      validPairs.push({ color: centroids[i], count: counts[i] });
    }
  }

  validPairs.sort((a, b) => b.count - a.count);

  const whiteRgb: RGB = { r: 255, g: 255, b: 255 };
  const blackRgb: RGB = { r: 0, g: 0, b: 0 };

  const colors: ExtractedColor[] = validPairs.slice(0, k).map((pair) => {
    const rgb: RGB = {
      r: Math.round(pair.color[0]),
      g: Math.round(pair.color[1]),
      b: Math.round(pair.color[2]),
    };
    const brightness = getBrightness(rgb.r, rgb.g, rgb.b);
    const contrastColor = brightness > 0.5 ? blackRgb : whiteRgb;
    return createExtractedColor(rgb, contrastColor, pair.count / totalPixels);
  });

  while (colors.length < k) {
    const filler = createExtractedColor(
      { r: 128, g: 128, b: 128 },
      whiteRgb,
      0,
    );
    colors.push(filler);
  }

  onProgress?.(0.92);

  const brightnessValues = colors.map((c) => c.brightness);
  const averageBrightness =
    brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;

  const saturationValues = colors.map((c) => c.hsv.s);
  const saturation =
    saturationValues.reduce((a, b) => a + b, 0) / saturationValues.length;

  const hueDistribution = new Array(12).fill(0);
  colors.forEach((c, idx) => {
    const weight = colors[idx].percentage || 0.1;
    const bin = Math.min(11, Math.floor(c.hsv.h / 30));
    hueDistribution[bin] += weight;
  });

  const dominant = colors[0];

  onProgress?.(1.0);

  return {
    colors,
    dominant,
    averageBrightness,
    saturation,
    hueDistribution,
  };
}

export interface ExtractColorsWorkerResult {
  result: ColorExtractResult;
}

export function processImageInWorker(
  imageData: ImageData,
  onProgress: (progress: number) => void,
): Promise<ColorExtractResult> {
  return new Promise((resolve, reject) => {
    try {
      const result = extractColors(imageData, 5, onProgress);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

export { hexToRgb, rgbToHsv };
