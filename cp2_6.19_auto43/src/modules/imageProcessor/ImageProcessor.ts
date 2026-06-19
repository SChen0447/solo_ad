import { v4 as uuidv4 } from 'uuid';
import type { ProcessedImageData, ColorEntry, FilledRegion, Point } from './types';

const MAX_COLORS = 15;
const PROCESS_SIZE = 512;

export class ImageProcessor {
  public async processImage(file: File): Promise<ProcessedImageData> {
    const img = await this.loadImage(file);
    const { canvas, ctx } = this.createCanvas(PROCESS_SIZE, PROCESS_SIZE);

    const scale = Math.min(PROCESS_SIZE / img.width, PROCESS_SIZE / img.height);
    const drawW = Math.floor(img.width * scale);
    const drawH = Math.floor(img.height * scale);
    const offsetX = Math.floor((PROCESS_SIZE - drawW) / 2);
    const offsetY = Math.floor((PROCESS_SIZE - drawH) / 2);

    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, PROCESS_SIZE, PROCESS_SIZE);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    const imageData = ctx.getImageData(0, 0, PROCESS_SIZE, PROCESS_SIZE);
    const originalImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    const colorPalette = this.quantizeColors(imageData, MAX_COLORS);
    const pixelColorMap = this.mapPixelsToColors(imageData, colorPalette);
    const edgeMask = this.detectEdges(pixelColorMap);
    const lineArtCanvas = this.createLineArt(edgeMask, pixelColorMap, colorPalette);
    const regions = this.segmentRegions(pixelColorMap, edgeMask, colorPalette);

    return {
      width: PROCESS_SIZE,
      height: PROCESS_SIZE,
      originalImageData,
      lineArtCanvas,
      regions,
      colorPalette,
      pixelColorMap,
    };
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private createCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    return { canvas, ctx };
  }

  private quantizeColors(imageData: ImageData, k: number): ColorEntry[] {
    const pixels: number[][] = [];
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 128) {
        pixels.push([r, g, b]);
      }
    }

    if (pixels.length === 0) {
      return [{ index: 0, color: 'rgb(128,128,128)', hex: '#808080' }];
    }

    const step = Math.max(1, Math.floor(pixels.length / 5000));
    const samplePixels: number[][] = [];
    for (let i = 0; i < pixels.length; i += step) {
      samplePixels.push(pixels[i]);
    }

    let centroids: number[][] = this.initCentroids(samplePixels, k);

    for (let iter = 0; iter < 10; iter++) {
      const clusters: number[][][] = Array.from({ length: k }, () => []);
      for (const pixel of samplePixels) {
        let minDist = Infinity;
        let minIdx = 0;
        for (let j = 0; j < centroids.length; j++) {
          const d = this.colorDist(pixel, centroids[j]);
          if (d < minDist) {
            minDist = d;
            minIdx = j;
          }
        }
        clusters[minIdx].push(pixel);
      }

      for (let j = 0; j < centroids.length; j++) {
        if (clusters[j].length > 0) {
          centroids[j] = [
            Math.round(clusters[j].reduce((s, p) => s + p[0], 0) / clusters[j].length),
            Math.round(clusters[j].reduce((s, p) => s + p[1], 0) / clusters[j].length),
            Math.round(clusters[j].reduce((s, p) => s + p[2], 0) / clusters[j].length),
          ];
        }
      }
    }

    centroids = centroids.filter((_, i) => {
      const pixelSet = new Set<string>();
      for (const p of samplePixels) {
        let minDist = Infinity;
        let minIdx = 0;
        for (let j = 0; j < centroids.length; j++) {
          const d = this.colorDist(p, centroids[j]);
          if (d < minDist) {
            minDist = d;
            minIdx = j;
          }
        }
        if (minIdx === i) pixelSet.add(`${p[0]},${p[1]},${p[2]}`);
      }
      return pixelSet.size > 0;
    });

    return centroids.map((c, i) => ({
      index: i,
      color: `rgb(${c[0]},${c[1]},${c[2]})`,
      hex: this.rgbToHex(c[0], c[1], c[2]),
    }));
  }

  private initCentroids(pixels: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const used = new Set<number>();
    while (centroids.length < k && centroids.length < pixels.length) {
      const idx = Math.floor(Math.random() * pixels.length);
      if (!used.has(idx)) {
        used.add(idx);
        centroids.push([...pixels[idx]]);
      }
    }
    return centroids;
  }

  private colorDist(a: number[], b: number[]): number {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  private mapPixelsToColors(imageData: ImageData, palette: ColorEntry[]): number[][] {
    const { width, height, data } = imageData;
    const map: number[][] = Array.from({ length: height }, () => new Array(width).fill(-1));
    const colors = palette.map(p => {
      const m = p.color.match(/\d+/g)!;
      return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
    });

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        if (a < 128) continue;
        const pixel = [data[idx], data[idx + 1], data[idx + 2]];
        let minDist = Infinity;
        let minIdx = 0;
        for (let j = 0; j < colors.length; j++) {
          const d = this.colorDist(pixel, colors[j]);
          if (d < minDist) {
            minDist = d;
            minIdx = j;
          }
        }
        map[y][x] = minIdx;
      }
    }
    return map;
  }

  private detectEdges(colorMap: number[][]): boolean[][] {
    const h = colorMap.length;
    const w = colorMap[0].length;
    const edges: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const c = colorMap[y][x];
        if (c === -1) continue;
        if (
          colorMap[y - 1][x] !== c ||
          colorMap[y + 1][x] !== c ||
          colorMap[y][x - 1] !== c ||
          colorMap[y][x + 1] !== c
        ) {
          edges[y][x] = true;
        }
      }
    }
    return edges;
  }

  private createLineArt(
    edgeMask: boolean[][],
    colorMap: number[][],
    palette: ColorEntry[]
  ): HTMLCanvasElement {
    const { canvas, ctx } = this.createCanvas(PROCESS_SIZE, PROCESS_SIZE);
    const imgData = ctx.createImageData(PROCESS_SIZE, PROCESS_SIZE);
    const data = imgData.data;

    for (let y = 0; y < PROCESS_SIZE; y++) {
      for (let x = 0; x < PROCESS_SIZE; x++) {
        const idx = (y * PROCESS_SIZE + x) * 4;
        if (edgeMask[y][x]) {
          data[idx] = 60;
          data[idx + 1] = 60;
          data[idx + 2] = 70;
          data[idx + 3] = 255;
        } else if (colorMap[y][x] !== -1) {
          data[idx] = 250;
          data[idx + 1] = 248;
          data[idx + 2] = 245;
          data[idx + 3] = 255;
        } else {
          data[idx] = 250;
          data[idx + 1] = 248;
          data[idx + 2] = 245;
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  private segmentRegions(
    colorMap: number[][],
    edgeMask: boolean[][],
    palette: ColorEntry[]
  ): FilledRegion[] {
    const h = colorMap.length;
    const w = colorMap[0].length;
    const visited: boolean[][] = Array.from({ length: h }, () => new Array(w).fill(false));
    const regions: FilledRegion[] = [];

    const minRegionSize = 80;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (visited[y][x] || edgeMask[y][x] || colorMap[y][x] === -1) continue;

        const colorIdx = colorMap[y][x];
        const pixels: Point[] = [];
        const stack: Point[] = [{ x, y }];
        visited[y][x] = true;

        while (stack.length > 0) {
          const p = stack.pop()!;
          pixels.push(p);

          const neighbors = [
            { x: p.x + 1, y: p.y },
            { x: p.x - 1, y: p.y },
            { x: p.x, y: p.y + 1 },
            { x: p.x, y: p.y - 1 },
          ];

          for (const n of neighbors) {
            if (
              n.x >= 0 && n.x < w && n.y >= 0 && n.y < h &&
              !visited[n.y][n.x] &&
              !edgeMask[n.y][n.x] &&
              colorMap[n.y][n.x] === colorIdx
            ) {
              visited[n.y][n.x] = true;
              stack.push(n);
            }
          }
        }

        if (pixels.length >= minRegionSize) {
          let sumX = 0, sumY = 0;
          for (const p of pixels) {
            sumX += p.x;
            sumY += p.y;
          }
          const centerX = Math.round(sumX / pixels.length);
          const centerY = Math.round(sumY / pixels.length);

          const boundary = this.extractBoundary(pixels, w, h);

          regions.push({
            id: uuidv4(),
            colorIndex: colorIdx,
            boundary,
            centerX,
            centerY,
            filled: false,
          });
        }
      }
    }

    for (const region of regions) {
      const path = new Path2D();
      if (region.boundary.length > 0) {
        path.moveTo(region.boundary[0].x, region.boundary[0].y);
        for (let i = 1; i < region.boundary.length; i++) {
          path.lineTo(region.boundary[i].x, region.boundary[i].y);
        }
        path.closePath();
      }
      region.path2D = path;
    }

    return regions;
  }

  private extractBoundary(pixels: Point[], w: number, h: number): Point[] {
    const set = new Set(pixels.map(p => `${p.x},${p.y}`));
    const boundarySet = new Set<string>();
    const boundary: Point[] = [];

    for (const p of pixels) {
      const neighbors = [
        { x: p.x + 1, y: p.y },
        { x: p.x - 1, y: p.y },
        { x: p.x, y: p.y + 1 },
        { x: p.x, y: p.y - 1 },
      ];
      for (const n of neighbors) {
        if (!set.has(`${n.x},${n.y}`)) {
          const key = `${p.x},${p.y}`;
          if (!boundarySet.has(key)) {
            boundarySet.add(key);
            boundary.push(p);
          }
          break;
        }
      }
    }

    if (boundary.length <= 200) return boundary;

    const simplified: Point[] = [];
    const step = Math.ceil(boundary.length / 200);
    for (let i = 0; i < boundary.length; i += step) {
      simplified.push(boundary[i]);
    }
    return simplified;
  }
}
