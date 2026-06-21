import { FontWrapper } from './fontLoader';
import { LayoutResult, LineLayout, GlyphPosition, TypesetParams } from './typesetter';

export interface RenderOptions {
  showGrid: boolean;
  showRuler: boolean;
  showBaselines: boolean;
  zoom: number;
  panX: number;
  panY: number;
  compareMode: boolean;
  customFontFamily?: string;
  defaultFontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
}

export interface CardRenderOptions {
  cardWidth: number;
  cardHeight: number;
  padding: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private useOffscreen: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number, dpr: number = window.devicePixelRatio || 1): void {
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setUseOffscreen(use: boolean): void {
    this.useOffscreen = use;
    if (use && !this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
    }
  }

  clear(bgColor: string = '#FAFAFA'): void {
    const { width, height } = this.canvas;
    const cssW = width / (window.devicePixelRatio || 1);
    const cssH = height / (window.devicePixelRatio || 1);
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  render(
    layout: LayoutResult,
    text: string,
    typesetParams: TypesetParams,
    options: RenderOptions,
    renderLeftHalf: boolean = true
  ): void {
    const dpr = window.devicePixelRatio || 1;
    const cssW = this.canvas.width / dpr;
    const cssH = this.canvas.height / dpr;
    const contentW = options.showRuler ? cssW - 20 : cssW;
    const contentStartX = options.showRuler ? 20 : 0;

    let targetCtx: CanvasRenderingContext2D = this.ctx;
    let canvasToUse: HTMLCanvasElement = this.canvas;

    if (this.useOffscreen && this.offscreenCanvas) {
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
      const offCtx = this.offscreenCanvas.getContext('2d');
      if (offCtx) {
        targetCtx = offCtx;
        canvasToUse = this.offscreenCanvas;
        targetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    const alphaMultiplier = options.compareMode ? 0.5 : 1;

    targetCtx.save();
    targetCtx.globalAlpha = options.backgroundColor ? 1 : alphaMultiplier;
    if (options.backgroundColor) {
      targetCtx.fillStyle = options.backgroundColor;
    } else {
      targetCtx.fillStyle = '#FAFAFA';
    }
    targetCtx.fillRect(0, 0, cssW, cssH);
    targetCtx.restore();

    targetCtx.save();
    targetCtx.globalAlpha = alphaMultiplier;

    if (options.showGrid) {
      this.drawGrid(targetCtx, cssW, cssH, options);
    }

    if (options.showRuler) {
      this.drawRuler(targetCtx, 0, 0, 20, cssH, options);
    }

    targetCtx.translate(options.panX, options.panY);
    targetCtx.scale(options.zoom, options.zoom);

    const margin = 40;
    const startX = contentStartX + margin - options.panX;
    const startY = 60 - options.panY;

    this.drawLines(targetCtx, layout, text, typesetParams, options, startX / options.zoom, startY / options.zoom);

    targetCtx.restore();

    if (this.useOffscreen && this.offscreenCanvas) {
      this.ctx.save();
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.clearRect(0, 0, cssW, cssH);
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, cssW, cssH);
      this.ctx.restore();
    }
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: RenderOptions
  ): void {
    ctx.save();
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 0.3;

    const spacing = 50;
    for (let x = 0; x <= width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRuler(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    options: RenderOptions
  ): void {
    ctx.save();
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'right';

    const step = 50;
    for (let py = 0; py <= h; py += step) {
      ctx.strokeStyle = '#CCC';
      ctx.beginPath();
      ctx.moveTo(x + w - 5, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();

      ctx.fillText(String(Math.floor(py)), x + w - 7, py + 3);
    }
    ctx.restore();
  }

  private drawLines(
    ctx: CanvasRenderingContext2D,
    layout: LayoutResult,
    text: string,
    typesetParams: TypesetParams,
    options: RenderOptions,
    startX: number,
    startY: number
  ): void {
    const fontFamily = options.customFontFamily || 'serif';
    const { fontSize } = typesetParams;
    const color = options.textColor || '#111111';

    ctx.fillStyle = color;
    ctx.font = `${fontSize}px "${fontFamily}", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';

    layout.lines.forEach((line, lineIdx) => {
      const lineY = startY + lineIdx * line.lineHeight + line.ascent;

      if (options.showBaselines) {
        ctx.save();
        ctx.strokeStyle = '#CCC';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(startX - 20, lineY);
        ctx.lineTo(startX + (typesetParams.maxWidth || 600) + 40, lineY);
        ctx.stroke();
        ctx.restore();
      }

      for (const g of line.glyphs) {
        if (g.char === ' ' || g.char === '\t') continue;
        ctx.fillText(g.char, startX + g.x, lineY);
      }
    });
  }

  renderTestCard(
    layout: LayoutResult,
    text: string,
    typesetParams: TypesetParams,
    options: CardRenderOptions & { fontFamily?: string }
  ): void {
    const { cardWidth, cardHeight, padding, fontFamily } = options;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(cardWidth * dpr);
    this.canvas.height = Math.floor(cardHeight * dpr);
    this.canvas.style.width = cardWidth + 'px';
    this.canvas.style.height = cardHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ctx = this.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, cardWidth, cardHeight);

    const contentWidth = cardWidth - padding * 2;
    const contentHeight = cardHeight - padding * 2;
    const { fontSize, lineHeightFactor } = typesetParams;

    ctx.save();
    ctx.fillStyle = '#111111';
    ctx.font = `${fontSize}px "${fontFamily}", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';

    const scale = Math.min(
      1,
      contentHeight / Math.max(layout.totalHeight, 1),
      contentWidth / Math.max(layout.totalWidth, 1)
    );

    ctx.translate(padding, padding);
    ctx.scale(scale, scale);

    const offsetX = (contentWidth / scale - layout.totalWidth) / 2;
    const offsetY = (contentHeight / scale - layout.totalHeight) / 2;

    layout.lines.forEach((line, lineIdx) => {
      const lineY = offsetY + lineIdx * line.lineHeight + line.ascent;
      for (const g of line.glyphs) {
        if (g.char === ' ' || g.char === '\t') continue;
        ctx.fillText(g.char, offsetX + g.x, lineY);
      }
    });
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#999';
    ctx.font = '8px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const meta = `${options.fontFamily?.split('_').slice(1, -2).join('_') || 'Unknown'} | ${fontSize}px | ${new Date().toLocaleDateString('zh-CN')}`;
    ctx.fillText(meta, cardWidth - padding, cardHeight - padding);
    ctx.restore();
  }

  getImageData(): string {
    return this.canvas.toDataURL('image/png');
  }

  async copyToClipboard(): Promise<void> {
    try {
      const dataURL = this.canvas.toDataURL('image/png');
      const blob = await (await fetch(dataURL)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
    } catch (e) {
      throw e;
    }
  }
}
