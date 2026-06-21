import type { PixelGrid, PixelColor } from '../../types';
import { createCanvas, getContext, gridToCanvas } from '../../utils/canvas';

export class TextureGenerator {
  public static generateSeamlessTexture(
    sourceGrid: PixelGrid,
    targetSize: number = 128
  ): HTMLCanvasElement {
    const sourceCanvas = gridToCanvas(sourceGrid);
    const sourceCtx = getContext(sourceCanvas);
    const sourceSize = sourceGrid.length;
    
    const sourceData = sourceCtx.getImageData(0, 0, sourceSize, sourceSize);
    const targetData = this.mirrorEdgeSample(sourceData, sourceSize, targetSize);
    
    const targetCanvas = createCanvas(targetSize, targetSize);
    const targetCtx = getContext(targetCanvas);
    targetCtx.putImageData(targetData, 0, 0);
    
    return targetCanvas;
  }

  private static mirrorEdgeSample(
    sourceData: ImageData,
    sourceSize: number,
    targetSize: number
  ): ImageData {
    const targetCanvas = createCanvas(targetSize, targetSize);
    const targetCtx = getContext(targetCanvas);
    const targetData = targetCtx.createImageData(targetSize, targetSize);
    
    const srcData32 = new Uint32Array(sourceData.data.buffer);
    const tgtData32 = new Uint32Array(targetData.data.buffer);
    
    const halfSource = sourceSize / 2;
    const scale = sourceSize / targetSize;
    
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        let sx = x * scale;
        let sy = y * scale;
        
        sx = this.mirror(sx, sourceSize);
        sy = this.mirror(sy, sourceSize);
        
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = Math.min(x0 + 1, sourceSize - 1);
        const y1 = Math.min(y0 + 1, sourceSize - 1);
        
        const fx = sx - x0;
        const fy = sy - y0;
        
        const idx00 = y0 * sourceSize + x0;
        const idx10 = y0 * sourceSize + x1;
        const idx01 = y1 * sourceSize + x0;
        const idx11 = y1 * sourceSize + x1;
        
        const c00 = this.getPixelColor(srcData32, idx00);
        const c10 = this.getPixelColor(srcData32, idx10);
        const c01 = this.getPixelColor(srcData32, idx01);
        const c11 = this.getPixelColor(srcData32, idx11);
        
        const topR = this.lerp(c00.r, c10.r, fx);
        const topG = this.lerp(c00.g, c10.g, fx);
        const topB = this.lerp(c00.b, c10.b, fx);
        const topA = this.lerp(c00.a, c10.a, fx);
        
        const botR = this.lerp(c01.r, c11.r, fx);
        const botG = this.lerp(c01.g, c11.g, fx);
        const botB = this.lerp(c01.b, c11.b, fx);
        const botA = this.lerp(c01.a, c11.a, fx);
        
        const r = Math.round(this.lerp(topR, botR, fy));
        const g = Math.round(this.lerp(topG, botG, fy));
        const b = Math.round(this.lerp(topB, botB, fy));
        const a = Math.round(this.lerp(topA, botA, fy));
        
        const targetIdx = y * targetSize + x;
        tgtData32[targetIdx] = (a << 24) | (b << 16) | (g << 8) | r;
      }
    }
    
    return targetData;
  }

  private static mirror(value: number, size: number): number {
    while (value < 0 || value > size) {
      if (value < 0) {
        value = -value;
      } else if (value > size) {
        value = 2 * size - value;
      }
    }
    return Math.max(0, Math.min(size - 0.001, value));
  }

  private static getPixelColor(data: Uint32Array, idx: number): PixelColor {
    const pixel = data[idx];
    return {
      r: pixel & 0xff,
      g: (pixel >> 8) & 0xff,
      b: (pixel >> 16) & 0xff,
      a: (pixel >> 24) & 0xff,
    };
  }

  private static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public static createTiledPreview(
    textureCanvas: HTMLCanvasElement,
    tilesX: number = 4,
    tilesY: number = 4
  ): HTMLCanvasElement {
    const tileSize = textureCanvas.width;
    const previewWidth = tileSize * tilesX;
    const previewHeight = tileSize * tilesY;
    
    const previewCanvas = createCanvas(previewWidth, previewHeight);
    const previewCtx = getContext(previewCanvas);
    
    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        previewCtx.drawImage(
          textureCanvas,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize
        );
      }
    }
    
    this.drawGridLines(previewCtx, previewWidth, previewHeight, tileSize, '#ffff00', 2);
    
    return previewCanvas;
  }

  private static drawGridLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cellSize: number,
    color: string,
    lineWidth: number
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    for (let x = 0; x <= width; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
  }

  public static create16x16FromGrid(grid: PixelGrid): HTMLCanvasElement {
    return gridToCanvas(grid);
  }
}
