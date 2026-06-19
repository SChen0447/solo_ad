import { v4 as uuidv4 } from 'uuid';
import type { ProcessedImageData, Region, ColorInfo, Point } from './types';

const MAX_COLORS = 15;
const PROCESS_SIZE = 256;

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return dr * dr + dg * dg + db * db;
}

function quantizeColors(imageData: ImageData, maxColors: number): { quantized: Uint8ClampedArray; palette: ColorInfo[] } {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  
  const colorCounts = new Map<number, number>();
  
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = data[idx] >> 3 << 3;
    const g = data[idx + 1] >> 3 << 3;
    const b = data[idx + 2] >> 3 << 3;
    const key = (r << 16) | (g << 8) | b;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }
  
  let colors = Array.from(colorCounts.entries())
    .map(([key, count]) => ({
      rgb: [(key >> 16) & 0xFF, (key >> 8) & 0xFF, key & 0xFF] as [number, number, number],
      count
    }))
    .sort((a, b) => b.count - a.count);
  
  if (colors.length > maxColors) {
    const palette: { rgb: [number, number, number]; count: number }[] = [];
    const used = new Set<number>();
    
    for (let i = 0; i < maxColors && colors.length > 0; i++) {
      palette.push(colors[0]);
      used.add(0);
      const target = colors[0].rgb;
      
      for (let j = 1; j < colors.length; j++) {
        if (colorDistance(colors[j].rgb, target) < 3000) {
          palette[i].count += colors[j].count;
        }
      }
      
      colors = colors.filter((_, idx) => !used.has(idx) && colorDistance(colors[idx].rgb, target) >= 3000);
      used.clear();
    }
    
    const finalPalette: ColorInfo[] = palette.map((c, i) => ({
      index: i,
      rgb: c.rgb,
      hex: rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]),
      count: c.count
    }));
    
    const quantized = new Uint8ClampedArray(data.length);
    
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const pixel: [number, number, number] = [data[idx], data[idx + 1], data[idx + 2]];
      
      let minDist = Infinity;
      let bestIdx = 0;
      for (let j = 0; j < finalPalette.length; j++) {
        const d = colorDistance(pixel, finalPalette[j].rgb);
        if (d < minDist) {
          minDist = d;
          bestIdx = j;
        }
      }
      
      quantized[idx] = finalPalette[bestIdx].rgb[0];
      quantized[idx + 1] = finalPalette[bestIdx].rgb[1];
      quantized[idx + 2] = finalPalette[bestIdx].rgb[2];
      quantized[idx + 3] = 255;
    }
    
    return { quantized, palette: finalPalette };
  } else {
    const finalPalette: ColorInfo[] = colors.map((c, i) => ({
      index: i,
      rgb: c.rgb,
      hex: rgbToHex(c.rgb[0], c.rgb[1], c.rgb[2]),
      count: c.count
    }));
    
    const quantized = new Uint8ClampedArray(data.length);
    for (let i = 0; i < pixelCount; i++) {
      const idx = i * 4;
      const pixel: [number, number, number] = [data[idx], data[idx + 1], data[idx + 2]];
      
      let minDist = Infinity;
      let bestIdx = 0;
      for (let j = 0; j < finalPalette.length; j++) {
        const d = colorDistance(pixel, finalPalette[j].rgb);
        if (d < minDist) {
          minDist = d;
          bestIdx = j;
        }
      }
      
      quantized[idx] = finalPalette[bestIdx].rgb[0];
      quantized[idx + 1] = finalPalette[bestIdx].rgb[1];
      quantized[idx + 2] = finalPalette[bestIdx].rgb[2];
      quantized[idx + 3] = 255;
    }
    
    return { quantized, palette: finalPalette };
  }
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
