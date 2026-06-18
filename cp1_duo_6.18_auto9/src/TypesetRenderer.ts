import { TypesetParams, FontData } from './types';

export interface RenderConfig {
  text: string;
  params: TypesetParams;
  font: FontData;
  width: number;
  height: number;
  padding?: number;
  scale?: number;
}

export interface TextLine {
  text: string;
  width: number;
  x: number;
  y: number;
}

export class TypesetRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private pendingConfig: RenderConfig | null = null;
  private pendingResolve: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
  }

  render(config: RenderConfig): Promise<void> {
    return new Promise((resolve) => {
      this.pendingConfig = config;

      if (this.pendingResolve) {
        this.pendingResolve();
        this.pendingResolve = null;
      }
      this.pendingResolve = resolve;

      if (this.animationFrameId !== null) {
        return;
      }

      this.animationFrameId = requestAnimationFrame(() => {
        try {
          if (this.pendingConfig) {
            this.performRender(this.pendingConfig);
            this.pendingConfig = null;
          }
        } finally {
          this.animationFrameId = null;
          if (this.pendingResolve) {
            this.pendingResolve();
            this.pendingResolve = null;
          }
        }
      });
    });
  }

  private performRender(config: RenderConfig): void {
    const {
      text,
      params,
      font,
      width,
      height,
      padding = 24,
      scale = 1,
    } = config;

    const scaledWidth = Math.floor(width * scale);
    const scaledHeight = Math.floor(height * scale);

    if (this.canvas.width !== scaledWidth || this.canvas.height !== scaledHeight) {
      this.canvas.width = scaledWidth;
      this.canvas.height = scaledHeight;
    }

    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    const fontSize = params.fontSize;
    const lineHeight = fontSize * params.lineHeight;
    const letterSpacing = params.letterSpacing;
    const fontWeight = params.fontWeight;
    const color = params.color;

    this.ctx.font = `${fontWeight} ${fontSize}px ${font.family}`;
    this.ctx.fillStyle = color;
    this.ctx.textBaseline = 'top';

    const availableWidth = width - padding * 2;
    const lines = this.wrapText(text, availableWidth, fontSize, letterSpacing, font, fontWeight);

    const totalHeight = lines.length * lineHeight;
    const startY = padding + Math.max(0, (height - padding * 2 - totalHeight) / 2);

    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
      this.drawLine(line.text, padding, y, fontSize, letterSpacing, font, fontWeight);
    });
  }

  private wrapText(
    text: string,
    maxWidth: number,
    fontSize: number,
    letterSpacing: number,
    font: FontData,
    fontWeight: number
  ): TextLine[] {
    if (!text) return [];

    const lines: TextLine[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph === '') {
        lines.push({ text: '', width: 0, x: 0, y: 0 });
        continue;
      }

      const words = paragraph.split(/(\s+)/);
      let currentLine = '';
      let currentWidth = 0;

      for (const word of words) {
        const wordWidth = this.measureText(word, fontSize, letterSpacing, font, fontWeight);

        if (currentLine === '') {
          currentLine = word;
          currentWidth = wordWidth;
        } else if (currentWidth + wordWidth <= maxWidth) {
          currentLine += word;
          currentWidth += wordWidth;
        } else {
          lines.push({
            text: currentLine.trimEnd(),
            width: currentWidth,
            x: 0,
            y: 0,
          });
          currentLine = word.trimStart();
          currentWidth = this.measureText(currentLine, fontSize, letterSpacing, font, fontWeight);
        }
      }

      if (currentLine) {
        lines.push({
          text: currentLine,
          width: currentWidth,
          x: 0,
          y: 0,
        });
      }
    }

    return lines;
  }

  private measureText(
    text: string,
    fontSize: number,
    letterSpacing: number,
    font: FontData,
    fontWeight: number
  ): number {
    if (!text) return 0;

    this.ctx.font = `${fontWeight} ${fontSize}px ${font.family}`;
    const metrics = this.ctx.measureText(text);
    const baseWidth = metrics.width;
    const spacingWidth = (text.length - 1) * letterSpacing;

    return baseWidth + spacingWidth;
  }

  private drawLine(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    letterSpacing: number,
    font: FontData,
    fontWeight: number
  ): void {
    if (!text) return;

    this.ctx.font = `${fontWeight} ${fontSize}px ${font.family}`;

    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      this.ctx.fillText(char, currentX, y);
      const charWidth = this.ctx.measureText(char).width;
      currentX += charWidth + letterSpacing;
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  toDataURL(type: string = 'image/png'): string {
    return this.canvas.toDataURL(type);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.pendingConfig = null;
    if (this.pendingResolve) {
      this.pendingResolve();
      this.pendingResolve = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  static async renderToImage(
    configs: RenderConfig[],
    exportHeight: number = 400,
    scale: number = 2
  ): Promise<string> {
    const totalWidth = configs.reduce((sum, c) => sum + c.width, 0);
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(totalWidth * scale);
    canvas.height = Math.floor(exportHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建Canvas上下文');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let offsetX = 0;

    for (const config of configs) {
      const tempCanvas = document.createElement('canvas');
      const renderer = new TypesetRenderer(tempCanvas);

      await renderer.render({
        ...config,
        height: exportHeight,
        scale,
      });

      ctx.drawImage(
        tempCanvas,
        Math.floor(offsetX * scale),
        0,
        Math.floor(config.width * scale),
        Math.floor(exportHeight * scale)
      );

      offsetX += config.width;

      if (configs.indexOf(config) < configs.length - 1) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.beginPath();
        ctx.moveTo(Math.floor(offsetX * scale), 0);
        ctx.lineTo(Math.floor(offsetX * scale), Math.floor(exportHeight * scale));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      renderer.destroy();
    }

    return canvas.toDataURL('image/png');
  }
}
