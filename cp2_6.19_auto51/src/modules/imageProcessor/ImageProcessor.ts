import { v4 as uuidv4 } from 'uuid';
import type { ProcessedImageData, Region, ColorInfo, Point } from './types';

const MAX_COLORS = 15;
const PROCESS_SIZE = 256;

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return dr * dr + dg * dg + db * db;
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  let x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
  let y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
  let z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
  const e = 0.008856;
  const k = 903.3;
  const fx = x > e ? Math.cbrt(x) : (k * x + 16) / 116;
  const fy = y > e ? Math.cbrt(y) : (k * y + 16) / 116;
  const fz = z > e ? Math.cbrt(z) : (k * z + 16) / 116;
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function applyMorandiTone(rgb: [number, number, number]): [number, number, number] {
  const [L, a, b] = rgbToLab(rgb[0], rgb[1], rgb[2]);
  const satFactor = 0.55;
  const lightShift = 12;
  const newA = a * satFactor;
  const newB = b * satFactor;
  const newL = Math.min(92, L + lightShift * (1 - L / 100));
  const fy = (newL + 16) / 116;
  const fx = newA / 500 + fy;
  const fz = fy - newB / 200;
  const e = 0.008856;
  const k = 903.3;
  const xr = fx * fx * fx > e ? fx * fx * fx : (116 * fx - 16) / k;
  const yr = newL > k * e ? Math.pow((newL + 16) / 116, 3) : newL / k;
  const zr = fz * fz * fz > e ? fz * fz * fz : (116 * fz - 16) / k;
  const x = xr * 0.95047;
  const y = yr * 1.00000;
  const z = zr * 1.08883;
  let rr = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let gg = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bb = x * 0.0557 + y * -0.2040 + z * 1.0570;
  const srgb = (v: number) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  rr = Math.max(0, Math.min(255, Math.round(srgb(rr) * 255)));
  gg = Math.max(0, Math.min(255, Math.round(srgb(gg) * 255)));
  bb = Math.max(0, Math.min(255, Math.round(srgb(bb) * 255)));
  return [rr, gg, bb];
}

interface ColorBucket {
  pixels: Array<[number, number, number]>;
  count: number;
  ranges: [number, number, number, number, number, number];
}

function computeBucketRanges(pixels: Array<[number, number, number]>): [number, number, number, number, number, number] {
  let minR = Infinity, maxR = -Infinity;
  let minG = Infinity, maxG = -Infinity;
  let minB = Infinity, maxB = -Infinity;
  for (const [r, g, b] of pixels) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }
  return [minR, maxR, minG, maxG, minB, maxB];
}

function medianCutQuantize(
  pixels: Array<[number, number, number]>,
  maxColors: number
): Array<{ rgb: [number, number, number]; count: number }> {
  if (pixels.length === 0) return [];

  const initialBucket: ColorBucket = {
    pixels,
    count: pixels.length,
    ranges: computeBucketRanges(pixels)
  };
  const buckets: ColorBucket[] = [initialBucket];

  while (buckets.length < maxColors) {
    let maxRange = -1;
    let targetIdx = -1;
    let targetChannel = 0;

    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      if (b.pixels.length < 2) continue;
      const [minR, maxR, minG, maxG, minB, maxB] = b.ranges;
      const rRange = maxR - minR;
      const gRange = maxG - minG;
      const bRange = maxB - minB;
      const range = Math.max(rRange, gRange, bRange);
      if (range > maxRange) {
        maxRange = range;
        targetIdx = i;
        if (rRange >= gRange && rRange >= bRange) targetChannel = 0;
        else if (gRange >= bRange) targetChannel = 1;
        else targetChannel = 2;
      }
    }

    if (targetIdx === -1 || maxRange <= 2) break;

    const bucket = buckets[targetIdx];
    const sorted = bucket.pixels.slice().sort((a, b) => a[targetChannel] - b[targetChannel]);
    const median = Math.floor(sorted.length / 2);
    const leftPixels = sorted.slice(0, median);
    const rightPixels = sorted.slice(median);

    if (leftPixels.length === 0 || rightPixels.length === 0) {
      break;
    }

    buckets.splice(targetIdx, 1, {
      pixels: leftPixels,
      count: leftPixels.length,
      ranges: computeBucketRanges(leftPixels)
    }, {
      pixels: rightPixels,
      count: rightPixels.length,
      ranges: computeBucketRanges(rightPixels)
    });
  }

  return buckets.map(b => {
    let sr = 0, sg = 0, sb = 0;
    for (const [r, g, b] of b.pixels) {
      sr += r;
      sg += g;
      sb += b;
    }
    const n = b.pixels.length;
    return {
      rgb: applyMorandiTone([Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)]),
      count: b.count
    };
  }).sort((a, b) => b.count - a.count);
}

function quantizeColors(imageData: ImageData, maxColors: number): { quantized: Uint8ClampedArray; palette: ColorInfo[] } {
  const { data, width, height } = imageData;
  const pixelCount = width * height;

  const sampleRate = pixelCount > 20000 ? Math.ceil(pixelCount / 20000) : 1;
  const sampledPixels: Array<[number, number, number]> = [];
  for (let i = 0; i < pixelCount; i += sampleRate) {
    const idx = i * 4;
    if (data[idx + 3] > 128) {
      sampledPixels.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }
  if (sampledPixels.length === 0) {
    const fallback: ColorInfo[] = [{
      index: 0,
      rgb: [200, 195, 185] as [number, number, number],
      hex: '#C8C3B9',
      count: pixelCount
    }];
    const quantized = new Uint8ClampedArray(data.length);
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      quantized[idx] = 200;
      quantized[idx + 1] = 195;
      quantized[idx + 2] = 185;
      quantized[idx + 3] = 255;
    }
    return { quantized, palette: fallback };
  }

  const clusters = medianCutQuantize(sampledPixels, maxColors);

  const finalPalette: ColorInfo[] = clusters.map((c, i) => ({
    index: i,
    rgb: c.rgb,
    hex: rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]),
    count: c.count
  }));

  const quantized = new Uint8ClampedArray(data.length);
  const paletteCount = finalPalette.length;
  const paletteRgbs = finalPalette.map(c => c.rgb);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const pr = data[idx];
    const pg = data[idx + 1];
    const pb = data[idx + 2];

    let minDist = Infinity;
    let bestIdx = 0;
    for (let j = 0; j < paletteCount; j++) {
      const [r, g, b] = paletteRgbs[j];
      const dr = pr - r;
      const dg = pg - g;
      const db = pb - b;
      const d = dr * dr + dg * dg + db * db;
      if (d < minDist) {
        minDist = d;
        bestIdx = j;
      }
    }

    const best = paletteRgbs[bestIdx];
    quantized[idx] = best[0];
    quantized[idx + 1] = best[1];
    quantized[idx + 2] = best[2];
    quantized[idx + 3] = 255;
  }

  return { quantized, palette: finalPalette };
}

function detectEdges(quantized: Uint8ClampedArray, width: number, height: number, palette: ColorInfo[]): { edgeMap: Uint8Array; colorIndexMap: Int32Array } {
  const edgeMap = new Uint8Array(width * height);
  const colorIndexMap = new Int32Array(width * height);
  const pixelCount = width * height;
  
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const pixel: [number, number, number] = [quantized[idx], quantized[idx + 1], quantized[idx + 2]];
    let minDist = Infinity;
    let bestIdx = 0;
    for (let j = 0; j < palette.length; j++) {
      const d = colorDistance(pixel, palette[j].rgb);
      if (d < minDist) {
        minDist = d;
        bestIdx = j;
      }
    }
    colorIndexMap[i] = bestIdx;
  }
  
  const dirs = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const ci = colorIndexMap[i];
      let isEdge = false;
      
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          isEdge = true;
          break;
        }
        const ni = ny * width + nx;
        if (colorIndexMap[ni] !== ci) {
          isEdge = true;
          break;
        }
      }
      
      if (isEdge) edgeMap[i] = 1;
    }
  }
  
  return { edgeMap, colorIndexMap };
}

function floodFillRegions(
  colorIndexMap: Int32Array,
  edgeMap: Uint8Array,
  width: number,
  height: number,
  _palette: ColorInfo[]
): { regions: Region[]; regionMap: Int32Array } {
  const pixelCount = width * height;
  const regionMap = new Int32Array(pixelCount).fill(-1);
  const regions: Region[] = [];
  const visited = new Uint8Array(pixelCount);
  const queue: number[] = new Array(pixelCount);
  
  let head = 0;
  let tail = 0;
  let regionId = 0;
  
  for (let start = 0; start < pixelCount; start++) {
    if (visited[start] || edgeMap[start]) continue;
    
    const targetColor = colorIndexMap[start];
    head = 0;
    tail = 0;
    
    queue[tail++] = start;
    visited[start] = 1;
    
    const pixels: number[] = [];
    
    while (head < tail) {
      const cur = queue[head++];
      pixels.push(cur);
      regionMap[cur] = regionId;
      
      const x = cur % width;
      
      const neighbors = [
        cur - 1,
        cur + 1,
        cur - width,
        cur + width
      ];
      
      for (const n of neighbors) {
        const nx = n % width;
        
        if (n < 0 || n >= pixelCount) continue;
        if (Math.abs(nx - x) > 1) continue;
        if (visited[n]) continue;
        if (edgeMap[n]) continue;
        if (colorIndexMap[n] !== targetColor) continue;
        
        visited[n] = 1;
        queue[tail++] = n;
      }
    }
    
    if (pixels.length > 3) {
      const pixelPoints: Point[] = [];
      let sumX = 0;
      let sumY = 0;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const boundarySet = new Set<number>();
      const boundary: Point[] = [];
      
      for (const p of pixels) {
        const px = p % width;
        const py = Math.floor(p / width);
        pixelPoints.push({ x: px, y: py });
        sumX += px;
        sumY += py;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
        
        const neighbors = [p - 1, p + 1, p - width, p + width];
        let isBoundary = false;
        for (const n of neighbors) {
          if (n < 0 || n >= pixelCount || regionMap[n] !== regionId) {
            isBoundary = true;
            break;
          }
        }
        if (isBoundary && !boundarySet.has(p)) {
          boundarySet.add(p);
          boundary.push({ x: px, y: py });
        }
      }
      
      const centroid: Point = {
        x: Math.round(sumX / pixels.length),
        y: Math.round(sumY / pixels.length)
      };
      
      const labelPosition: Point = {
        x: Math.max(minX + 2, Math.min(maxX - 6, centroid.x - 3)),
        y: Math.max(minY + 2, Math.min(maxY - 6, centroid.y + 3))
      };
      
      const sortedBoundary = boundary.length > 50
        ? boundary.filter((_, i) => i % Math.ceil(boundary.length / 50) === 0)
        : boundary;
      
      regions.push({
        id: uuidv4(),
        colorIndex: targetColor,
        pixels: pixelPoints.length > 200
          ? pixelPoints.filter((_, i) => i % Math.ceil(pixelPoints.length / 200) === 0)
          : pixelPoints,
        boundary: sortedBoundary,
        centroid,
        labelPosition
      });
      
      regionId++;
    } else {
      for (const p of pixels) {
        regionMap[p] = -1;
      }
    }
  }
  
  return { regions, regionMap };
}

function generateLineArt(
  edgeMap: Uint8Array,
  width: number,
  height: number,
  palette: ColorInfo[],
  colorIndexMap: Int32Array
): ImageData {
  const lineArt = new ImageData(width, height);
  const data = lineArt.data;
  
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    if (edgeMap[i]) {
      data[idx] = 60;
      data[idx + 1] = 60;
      data[idx + 2] = 70;
      data[idx + 3] = 255;
    } else {
      const ci = colorIndexMap[i];
      const c = palette[ci]?.rgb || [255, 255, 255];
      const lighten = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.55));
      data[idx] = lighten(c[0]);
      data[idx + 1] = lighten(c[1]);
      data[idx + 2] = lighten(c[2]);
      data[idx + 3] = 255;
    }
  }
  
  return lineArt;
}

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  async processImage(file: File): Promise<ProcessedImageData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const result = this.processLoadedImage(img);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  private processLoadedImage(img: HTMLImageElement): ProcessedImageData {
    const aspect = img.width / img.height;
    let pw: number, ph: number;
    
    if (aspect >= 1) {
      pw = PROCESS_SIZE;
      ph = Math.round(PROCESS_SIZE / aspect);
    } else {
      ph = PROCESS_SIZE;
      pw = Math.round(PROCESS_SIZE * aspect);
    }
    
    pw = Math.max(100, pw);
    ph = Math.max(100, ph);
    
    this.canvas.width = pw;
    this.canvas.height = ph;
    this.ctx.drawImage(img, 0, 0, pw, ph);
    
    const originalImageData = this.ctx.getImageData(0, 0, pw, ph);
    
    const { quantized, palette } = quantizeColors(originalImageData, MAX_COLORS);
    
    const { edgeMap, colorIndexMap } = detectEdges(quantized, pw, ph, palette);
    
    const { regions, regionMap } = floodFillRegions(colorIndexMap, edgeMap, pw, ph, palette);
    
    const lineArtImageData = generateLineArt(edgeMap, pw, ph, palette, colorIndexMap);
    
    return {
      width: pw,
      height: ph,
      originalImageData,
      lineArtImageData,
      regions,
      colorPalette: palette,
      regionMap
    };
  }
}
