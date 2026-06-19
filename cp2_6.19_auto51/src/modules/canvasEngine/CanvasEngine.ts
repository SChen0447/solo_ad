import { AnimationManager } from './AnimationManager';
import type { ProcessedImageData, Region, ColorInfo, FilledRegion, DisplayMode } from '../imageProcessor/types';

const EXPORT_SIZE = 1024;

interface RenderState {
  fillProgress: Map<string, number>;
  numberAlpha: Map<string, number>;
  flashIntensity: Map<string, number>;
  transitionAlpha: number;
  currentDisplay: DisplayMode;
  nextDisplay: DisplayMode | null;
}

export type CanvasClickCallback = (regionId: string | null, x: number, y: number) => void;

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationManager: AnimationManager;
  private processedData: ProcessedImageData | null = null;
  private filledRegions: Map<string, number> = new Map();
  private state: RenderState;
  private clickCallback: CanvasClickCallback | null = null;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private displaySize: { width: number; height: number } = { width: 0, height: 0 };
  private numberFadePlayed: Set<string> = new Set();
  private hoveredRegionId: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.animationManager = new AnimationManager();
    this.state = {
      fillProgress: new Map(),
      numberAlpha: new Map(),
      flashIntensity: new Map(),
      transitionAlpha: 1,
      currentDisplay: 'lineart',
      nextDisplay: null
    };

    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
  }

  setData(data: ProcessedImageData): void {
    this.processedData = data;
    this.filledRegions.clear();
    this.state.fillProgress.clear();
    this.state.numberAlpha.clear();
    this.state.flashIntensity.clear();
    this.numberFadePlayed.clear();
    this.state.currentDisplay = 'lineart';
    this.state.transitionAlpha = 1;
    this.state.nextDisplay = null;
    this.adjustDisplaySize();
    this.render();
    this.playAllNumberFadeIn();
  }

  setFilledRegions(filled: FilledRegion[]): void {
    for (const f of filled) {
      this.filledRegions.set(f.regionId, f.colorIndex);
      this.state.fillProgress.set(f.regionId, 1);
    }
    this.render();
  }

  setDisplayMode(mode: DisplayMode): void {
    if (mode === this.state.currentDisplay) return;
    
    this.state.nextDisplay = mode;
    this.animationManager.playFadeTransition(
      'fade-' + Date.now(),
      300,
      (progress) => {
        if (progress < 0.5) {
          this.state.transitionAlpha = 1 - progress * 2;
        } else {
          if (this.state.nextDisplay) {
            this.state.currentDisplay = this.state.nextDisplay;
            this.state.nextDisplay = null;
          }
          this.state.transitionAlpha = (progress - 0.5) * 2;
        }
        this.render();
      },
      () => {
        this.state.transitionAlpha = 1;
        this.render();
      }
    );
  }

  getDisplayMode(): DisplayMode {
    return this.state.currentDisplay;
  }

  setClickCallback(callback: CanvasClickCallback | null): void {
    this.clickCallback = callback;
  }

  setDisplaySize(width: number, height: number): void {
    this.displaySize = { width, height };
    this.canvas.width = width;
    this.canvas.height = height;
    this.adjustDisplaySize();
    this.render();
  }

  private adjustDisplaySize(): void {
    if (!this.processedData) return;
    const { width: dataW, height: dataH } = this.processedData;
    const { width: dispW, height: dispH } = this.displaySize;
    if (dispW === 0 || dispH === 0) return;

    const scale = Math.min(dispW / dataW, dispH / dataH);
    this.scale = scale;
    this.offsetX = (dispW - dataW * scale) / 2;
    this.offsetY = (dispH - dataH * scale) / 2;
  }

  async fillRegion(regionId: string, selectedColorIndex: number): Promise<{ correct: boolean }> {
    if (!this.processedData) return { correct: false };
    
    const region = this.processedData.regions.find(r => r.id === regionId);
    if (!region) return { correct: false };

    const isCorrect = selectedColorIndex === region.colorIndex;
    const previousFill = this.filledRegions.get(regionId);
    
    this.filledRegions.set(regionId, selectedColorIndex);
    
    await this.animationManager.playFillAnimation(
      'fill-' + regionId,
      200,
      (progress) => {
        this.state.fillProgress.set(regionId, progress);
        this.render();
      },
      () => {
        this.state.fillProgress.set(regionId, 1);
        this.render();
      }
    );

    if (!isCorrect) {
      await this.animationManager.playBorderFlash(
        'flash-' + regionId,
        500,
        (intensity) => {
          this.state.flashIntensity.set(regionId, intensity);
          this.render();
        },
        () => {
          this.state.flashIntensity.delete(regionId);
          if (previousFill !== undefined) {
            this.filledRegions.set(regionId, previousFill);
          } else {
            this.filledRegions.delete(regionId);
            this.state.fillProgress.delete(regionId);
          }
          this.render();
        }
      );
    }

    return { correct: isCorrect };
  }

  getProgress(): { filled: number; total: number; percentage: number } {
    if (!this.processedData) return { filled: 0, total: 0, percentage: 0 };
    const total = this.processedData.regions.length;
    let filled = 0;
    for (const r of this.processedData.regions) {
      const fc = this.filledRegions.get(r.id);
      if (fc !== undefined && fc === r.colorIndex) {
        filled++;
      }
    }
    return {
      filled,
      total,
      percentage: total > 0 ? (filled / total) * 100 : 0
    };
  }

  getFilledRegions(): FilledRegion[] {
    const result: FilledRegion[] = [];
    this.filledRegions.forEach((colorIndex, regionId) => {
      result.push({ regionId, colorIndex, timestamp: Date.now() });
    });
    return result;
  }

  async exportPNG(): Promise<Blob> {
    if (!this.processedData) throw new Error('No image data');

    const { width: dataW, height: dataH, regions, colorPalette } = this.processedData;
    const aspect = dataW / dataH;
    let ew: number, eh: number;
    if (aspect >= 1) {
      ew = EXPORT_SIZE;
      eh = Math.round(EXPORT_SIZE / aspect);
    } else {
      eh = EXPORT_SIZE;
      ew = Math.round(EXPORT_SIZE * aspect);
    }

    const scale = ew / dataW;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = ew;
    exportCanvas.height = eh;
    const ectx = exportCanvas.getContext('2d')!;

    ectx.fillStyle = '#FAF8F5';
    ectx.fillRect(0, 0, ew, eh);

    for (const region of regions) {
      const colorIdx = this.filledRegions.get(region.id);
      if (colorIdx !== undefined) {
        const color = colorPalette[colorIdx];
        if (color) {
          ectx.fillStyle = `rgb(${color.rgb[0]},${color.rgb[1]},${color.rgb[2]})`;
          this.drawRegionPath(ectx, region, scale, 0, 0);
          ectx.fill();
        }
      }
    }

    ectx.strokeStyle = 'rgba(60,60,70,0.6)';
    ectx.lineWidth = Math.max(1, scale * 0.6);
    for (const region of regions) {
      this.drawRegionPath(ectx, region, scale, 0, 0);
      ectx.stroke();
    }

    return new Promise((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Export failed'));
        },
        'image/png',
        1.0
      );
    });
  }

  private drawRegionPath(ctx: CanvasRenderingContext2D, region: Region, scale: number, offX: number, offY: number): void {
    if (region.boundary.length < 3) return;
    ctx.beginPath();
    const p0 = region.boundary[0];
    ctx.moveTo(offX + p0.x * scale, offY + p0.y * scale);
    for (let i = 1; i < region.boundary.length; i++) {
      const p = region.boundary[i];
      ctx.lineTo(offX + p.x * scale, offY + p.y * scale);
    }
    ctx.closePath();
  }

  private playAllNumberFadeIn(): void {
    if (!this.processedData) return;
    const regions = this.processedData.regions;
    
    regions.forEach((region, idx) => {
      if (this.numberFadePlayed.has(region.id)) return;
      this.numberFadePlayed.add(region.id);
      
      setTimeout(() => {
        this.animationManager.playNumberFadeIn(
          'num-' + region.id,
          300,
          (alpha) => {
            this.state.numberAlpha.set(region.id, alpha);
            this.render();
          },
          () => {
            this.state.numberAlpha.set(region.id, 1);
            this.render();
          }
        );
      }, idx * 3);
    });
  }

  private handleClick = (e: MouseEvent): void => {
    if (!this.clickCallback || !this.processedData) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.offsetX) / this.scale;
    const y = (e.clientY - rect.top - this.offsetY) / this.scale;
    
    const regionId = this.hitTest(x, y);
    this.clickCallback(regionId, x, y);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.processedData) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.offsetX) / this.scale;
    const y = (e.clientY - rect.top - this.offsetY) / this.scale;
    
    const regionId = this.hitTest(x, y);
    if (regionId !== this.hoveredRegionId) {
      this.hoveredRegionId = regionId;
      this.canvas.style.cursor = regionId ? 'crosshair' : 'default';
    }
  };

  private hitTest(x: number, y: number): string | null {
    if (!this.processedData) return null;
    const { width, height, regionMap, regions } = this.processedData;
    
    const px = Math.floor(x);
    const py = Math.floor(y);
    
    if (px < 0 || px >= width || py < 0 || py >= height) return null;
    
    const idx = py * width + px;
    const regionIdx = regionMap[idx];
    
    if (regionIdx >= 0 && regionIdx < regions.length) {
      return regions[regionIdx].id;
    }
    
    return null;
  }

  private colorToRgb(c: ColorInfo): string {
    return `rgb(${c.rgb[0]},${c.rgb[1]},${c.rgb[2]})`;
  }

  render(): void {
    const ctx = this.ctx;
    const { width: cw, height: ch } = this.canvas;
    
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, cw, ch);

    if (!this.processedData) {
      ctx.fillStyle = '#999';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('请上传一张图片开始创作', cw / 2, ch / 2);
      return;
    }

    const { width: dataW, height: dataH, originalImageData, lineArtImageData, regions, colorPalette } = this.processedData;
    const scale = this.scale;
    const ox = this.offsetX;
    const oy = this.offsetY;

    ctx.save();
    ctx.globalAlpha = this.state.transitionAlpha;

    if (this.state.currentDisplay === 'original') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = dataW;
      tempCanvas.height = dataH;
      tempCanvas.getContext('2d')!.putImageData(originalImageData, 0, 0);
      ctx.drawImage(tempCanvas, ox, oy, dataW * scale, dataH * scale);
    } else {
      if (this.state.currentDisplay === 'filled') {
        for (const region of regions) {
          const colorIdx = this.filledRegions.get(region.id);
          const progress = this.state.fillProgress.get(region.id) || 0;
          
          if (colorIdx !== undefined && progress > 0) {
            const color = colorPalette[colorIdx];
            if (color) {
              ctx.fillStyle = this.colorToRgb(color);
              this.renderRadialFill(ctx, region, scale, ox, oy, progress);
            }
          }
        }
      }

      const lineCanvas = document.createElement('canvas');
      lineCanvas.width = dataW;
      lineCanvas.height = dataH;
      lineCanvas.getContext('2d')!.putImageData(lineArtImageData, 0, 0);
      ctx.drawImage(lineCanvas, ox, oy, dataW * scale, dataH * scale);

      ctx.font = `${Math.max(8, Math.round(9 * scale))}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      for (const region of regions) {
        const alpha = this.state.numberAlpha.get(region.id) ?? 0;
        if (alpha <= 0) continue;

        const isFilled = this.filledRegions.has(region.id) && 
                        this.state.fillProgress.get(region.id) === 1 &&
                        this.filledRegions.get(region.id) === region.colorIndex;
        
        const labelX = ox + region.labelPosition.x * scale;
        const labelY = oy + region.labelPosition.y * scale;
        const labelText = String(region.colorIndex + 1);
        
        ctx.globalAlpha = alpha;
        
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeText(labelText, labelX, labelY);
        
        if (isFilled) {
          const r = colorPalette[region.colorIndex]?.rgb || [128, 128, 128];
          const brightness = (r[0] * 299 + r[1] * 587 + r[2] * 114) / 1000;
          ctx.fillStyle = brightness > 128 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)';
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
        }
        ctx.fillText(labelText, labelX, labelY);
        ctx.globalAlpha = this.state.transitionAlpha;
      }

      this.state.flashIntensity.forEach((intensity, regionId) => {
        const region = regions.find(r => r.id === regionId);
        if (!region) return;
        ctx.strokeStyle = `rgba(220,50,50,${intensity})`;
        ctx.lineWidth = Math.max(2, 3 * scale);
        this.drawRegionPath(ctx, region, scale, ox, oy);
        ctx.stroke();
      });

      if (this.hoveredRegionId) {
        const region = regions.find(r => r.id === this.hoveredRegionId);
        if (region) {
          ctx.strokeStyle = 'rgba(120,100,140,0.4)';
          ctx.lineWidth = Math.max(1.5, 2 * scale);
          this.drawRegionPath(ctx, region, scale, ox, oy);
          ctx.stroke();
        }
      }
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(200,190,180,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, dataW * scale, dataH * scale);
  }

  private renderRadialFill(
    ctx: CanvasRenderingContext2D,
    region: Region,
    scale: number,
    ox: number,
    oy: number,
    progress: number
  ): void {
    if (region.boundary.length < 3) return;
    
    const cx = ox + region.centroid.x * scale;
    const cy = oy + region.centroid.y * scale;
    
    let maxDist = 0;
    for (const p of region.boundary) {
      const dx = (p.x - region.centroid.x) * scale;
      const dy = (p.y - region.centroid.y) * scale;
      const d = dx * dx + dy * dy;
      if (d > maxDist) maxDist = d;
    }
    const radius = Math.sqrt(maxDist) * progress;
    
    ctx.save();
    this.drawRegionPath(ctx, region, scale, ox, oy);
    ctx.clip();
    
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    const fill = ctx.fillStyle as string;
    gradient.addColorStop(0, fill);
    gradient.addColorStop(0.7, fill);
    gradient.addColorStop(1, fill);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  destroy(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.animationManager.destroy();
  }
}
