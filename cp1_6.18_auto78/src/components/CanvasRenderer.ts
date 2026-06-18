import { TextStyle, KeyframeValue } from '../types';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private textStyle: TextStyle;
  private animatedValues: KeyframeValue;
  private lastFrameTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private onFpsUpdate?: (fps: number) => void;

  constructor(canvas: HTMLCanvasElement, onFpsUpdate?: (fps: number) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.textStyle = {
      text: '',
      fontFamily: 'Arial',
      fontSize: 48,
      color: '#ffffff',
      strokeWidth: 0,
      strokeColor: '#000000'
    };
    this.animatedValues = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1
    };
    this.onFpsUpdate = onFpsUpdate;
  }

  setTextStyle(style: TextStyle): void {
    this.textStyle = style;
  }

  setAnimatedValues(values: KeyframeValue): void {
    this.animatedValues = values;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.animationFrameId !== null) {
      return;
    }
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.frameCount = 0;
    this.loop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  renderFrame(): void {
    this.draw();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getFps(): number {
    return this.fps;
  }

  private loop = (): void => {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fps);
      }
    }

    this.draw();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, width, height);
    this.drawGrid(width, height);
    this.drawText(width, height);
  }

  private drawGrid(width: number, height: number): void {
    const gridSize = 10;
    const padding = 30;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    for (let x = padding; x <= width - padding; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, padding);
      this.ctx.lineTo(x, height - padding);
      this.ctx.stroke();
    }

    for (let y = padding; y <= height - padding; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(width - padding, y);
      this.ctx.stroke();
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

    this.ctx.restore();
  }

  private drawText(width: number, height: number): void {
    const { text, fontFamily, fontSize, color, strokeWidth, strokeColor } = this.textStyle;
    const { x, y, scale, rotation, opacity } = this.animatedValues;

    if (!text) return;

    const centerX = width / 2 + x;
    const centerY = height / 2 + y;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.scale(scale, scale);

    this.ctx.font = `bold ${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (strokeWidth > 0) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth * 2;
      this.ctx.lineJoin = 'round';
      this.ctx.strokeText(text, 0, 0);
    }

    this.ctx.fillStyle = color;
    this.ctx.fillText(text, 0, 0);

    this.ctx.restore();
  }

  destroy(): void {
    this.stop();
  }
}
