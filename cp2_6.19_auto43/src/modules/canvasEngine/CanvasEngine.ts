import type { ProcessedImageData, FilledRegion, DisplayMode, ColorEntry } from '../imageProcessor/types';
import { AnimationManager } from './AnimationManager';

interface FillAnimationState {
  regionId: string;
  color: string;
  progress: number;
}

interface FlashState {
  regionId: string;
  opacity: number;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animManager: AnimationManager;
  private processedData: ProcessedImageData | null = null;
  private displayMode: DisplayMode = 'lineart';
  private fillAnimations: Map<string, FillAnimationState> = new Map();
  private flashStates: Map<string, FlashState> = new Map();
  private hoverRegionId: string | null = null;
  private onFillComplete?: (regionId: string, colorIndex: number, correct: boolean) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.animManager = new AnimationManager();
  }

  public setProcessedData(data: ProcessedImageData): void {
    this.processedData = data;
    this.canvas.width = data.width;
    this.canvas.height = data.height;
    this.render();
  }

  public setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    this.render();
  }

  public setOnFillComplete(cb: (regionId: string, colorIndex: number, correct: boolean) => void): void {
    this.onFillComplete = cb;
  }

  public setHoverRegion(regionId: string | null): void {
    this.hoverRegionId = regionId;
    this.render();
  }

  public findRegionAtPoint(x: number, y: number): FilledRegion | null {
    if (!this.processedData) return null;

    for (const region of this.processedData.regions) {
      if (region.path2D && this.ctx.isPointInPath(region.path2D, x, y)) {
        return region;
      }
    }
    return null;
  }

  public async fillRegion(
    region: FilledRegion,
    selectedColorIndex: number,
    palette: ColorEntry[]
  ): Promise<boolean> {
    if (!this.processedData || region.filled) return false;

    const correct = selectedColorIndex === region.colorIndex;
    const color = palette[selectedColorIndex]?.hex || '#888888';

    await this.animManager.playFillAnimation((progress) => {
      this.fillAnimations.set(region.id, {
        regionId: region.id,
        color,
        progress,
      });
      this.render();
    }, 200);

    region.filled = true;
    region.filledColorIndex = selectedColorIndex;
    this.fillAnimations.delete(region.id);

    if (!correct) {
      await this.animManager.playErrorFlash((opacity) => {
        this.flashStates.set(region.id, { regionId: region.id, opacity });
        this.render();
      }, 500);
      this.flashStates.delete(region.id);
    }

    this.render();

    if (this.onFillComplete) {
      this.onFillComplete(region.id, selectedColorIndex, correct);
    }

    return correct;
  }

  public render(): void {
    if (!this.processedData) return;

    const { width, height, regions, colorPalette, lineArtCanvas, originalImageData } = this.processedData;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    if (this.displayMode === 'original') {
      ctx.putImageData(originalImageData, 0, 0);
    } else {
      ctx.drawImage(lineArtCanvas, 0, 0);

      for (const region of regions) {
        if (region.filled && region.filledColorIndex !== undefined) {
          const color = colorPalette[region.filledColorIndex]?.hex || '#888';
          if (region.path2D) {
            ctx.fillStyle = color;
            ctx.fill(region.path2D);
          }
        }

        const anim = this.fillAnimations.get(region.id);
        if (anim && region.path2D) {
          ctx.save();
          ctx.fillStyle = anim.color;
          ctx.globalAlpha = 0.3 + anim.progress * 0.7;
          ctx.beginPath();
          ctx.arc(region.centerX, region.centerY, Math.max(width, height) * anim.progress * 0.6, 0, Math.PI * 2);
          ctx.clip();
          ctx.fill(region.path2D);
          ctx.restore();
        }

        if (this.hoverRegionId === region.id && !region.filled && region.path2D) {
          ctx.save();
          ctx.fillStyle = 'rgba(139, 165, 181, 0.15)';
          ctx.fill(region.path2D);
          ctx.restore();
        }

        const flash = this.flashStates.get(region.id);
        if (flash && region.path2D) {
          ctx.save();
          ctx.strokeStyle = `rgba(220, 70, 70, ${flash.opacity})`;
          ctx.lineWidth = 3;
          ctx.stroke(region.path2D);
          ctx.restore();
        }
      }

      if (this.displayMode === 'lineart') {
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const region of regions) {
          if (!region.filled) {
            const label = String(region.colorIndex + 1);
            const padding = 3;
            const metrics = ctx.measureText(label);
            const textW = metrics.width + padding * 2;
            const textH = 12;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillRect(region.centerX - textW / 2, region.centerY - textH / 2, textW, textH);

            ctx.fillStyle = '#2c2c2c';
            ctx.fillText(label, region.centerX, region.centerY);
          }
        }
      }
    }
  }

  public exportPNG(size: number = 1024): Blob {
    if (!this.processedData) {
      throw new Error('No processed image data');
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ectx = exportCanvas.getContext('2d')!;

    ectx.fillStyle = '#FAF8F5';
    ectx.fillRect(0, 0, size, size);

    const { regions, colorPalette, originalImageData } = this.processedData;
    const scale = size / this.processedData.width;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImageData.width;
    tempCanvas.height = originalImageData.height;
    tempCanvas.getContext('2d')!.putImageData(originalImageData, 0, 0);

    ectx.drawImage(tempCanvas, 0, 0, size, size);

    for (const region of regions) {
      if (region.filled && region.filledColorIndex !== undefined) {
        const color = colorPalette[region.filledColorIndex]?.hex || '#888';
        ectx.save();
        ectx.beginPath();
        if (region.boundary.length > 0) {
          ectx.moveTo(region.boundary[0].x * scale, region.boundary[0].y * scale);
          for (let i = 1; i < region.boundary.length; i++) {
            ectx.lineTo(region.boundary[i].x * scale, region.boundary[i].y * scale);
          }
          ectx.closePath();
        }
        ectx.fillStyle = color;
        ectx.fill();
        ectx.restore();
      }
    }

    const blobPromise = new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Export failed'));
      }, 'image/png');
    });

    return new Blob([], { type: 'image/png' });
  }

  public async exportPNGAsync(size: number = 1024): Promise<Blob> {
    if (!this.processedData) {
      throw new Error('No processed image data');
    }

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ectx = exportCanvas.getContext('2d')!;

    ectx.fillStyle = '#FAF8F5';
    ectx.fillRect(0, 0, size, size);

    const { regions, colorPalette, originalImageData } = this.processedData;
    const scale = size / this.processedData.width;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImageData.width;
    tempCanvas.height = originalImageData.height;
    tempCanvas.getContext('2d')!.putImageData(originalImageData, 0, 0);

    ectx.drawImage(tempCanvas, 0, 0, size, size);

    for (const region of regions) {
      if (region.filled && region.filledColorIndex !== undefined) {
        const color = colorPalette[region.filledColorIndex]?.hex || '#888';
        ectx.save();
        ectx.beginPath();
        if (region.boundary.length > 0) {
          ectx.moveTo(region.boundary[0].x * scale, region.boundary[0].y * scale);
          for (let i = 1; i < region.boundary.length; i++) {
            ectx.lineTo(region.boundary[i].x * scale, region.boundary[i].y * scale);
          }
          ectx.closePath();
        }
        ectx.fillStyle = color;
        ectx.fill();
        ectx.restore();
      }
    }

    return new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Export failed'));
      }, 'image/png');
    });
  }

  public getProcessedData(): ProcessedImageData | null {
    return this.processedData;
  }

  public destroy(): void {
    this.animManager.cancelAll();
  }
}
