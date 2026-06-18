import { UndoManager } from './UndoManager';

export type ToolType = 'brush' | 'spray' | 'eraser';

interface DrawState {
  isDrawing: boolean;
  lastX: number;
  lastY: number;
  currentX: number;
  currentY: number;
  dirty: boolean;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawState: DrawState = {
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    currentX: 0,
    currentY: 0,
    dirty: false,
  };
  private undoManager: UndoManager;
  private _currentColor: string = '#ff0000';
  private _currentTool: ToolType = 'brush';
  private _brushRadius: number = 8;
  private _eraserRadius: number = 16;
  private _sprayRadius: number = 30;
  private _sprayDensity: number = 0.3;

  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 30;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsLastTime: number = 0;

  private sprayAccumTime: number = 0;
  private sprayInterval: number = 50;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private onStrokeEndCallbacks: (() => void)[] = [];
  private onUndoStateChangeCallbacks: (() => void)[] = [];

  private pendingSave: ImageData | null = null;
  private saveScheduled: boolean = false;

  constructor(canvas: HTMLCanvasElement, undoManager: UndoManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.undoManager = undoManager;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.bindEvents();
    this.startRenderLoop();
  }

  get currentColor(): string {
    return this._currentColor;
  }

  set currentColor(color: string) {
    this._currentColor = color;
  }

  get currentTool(): ToolType {
    return this._currentTool;
  }

  set currentTool(tool: ToolType) {
    this._currentTool = tool;
  }

  get undoManagerRef(): UndoManager {
    return this.undoManager;
  }

  get currentFps(): number {
    return this.fps;
  }

  onStrokeEnd(cb: () => void): () => void {
    this.onStrokeEndCallbacks.push(cb);
    return () => {
      this.onStrokeEndCallbacks = this.onStrokeEndCallbacks.filter(c => c !== cb);
    };
  }

  onUndoStateChange(cb: () => void): () => void {
    this.onUndoStateChangeCallbacks.push(cb);
    return () => {
      this.onUndoStateChangeCallbacks = this.onUndoStateChangeCallbacks.filter(c => c !== cb);
    };
  }

  private notifyStrokeEnd(): void {
    this.onStrokeEndCallbacks.forEach(cb => cb());
  }

  private notifyUndoStateChange(): void {
    this.onUndoStateChangeCallbacks.forEach(cb => cb());
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onPointerDown);
    this.canvas.addEventListener('mousemove', this.onPointerMove);
    this.canvas.addEventListener('mouseup', this.onPointerUp);
    this.canvas.addEventListener('mouseleave', this.onPointerUp);

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    this.canvas.addEventListener('touchcancel', this.onTouchEnd);
  }

  unbindEvents(): void {
    this.stopRenderLoop();

    this.canvas.removeEventListener('mousedown', this.onPointerDown);
    this.canvas.removeEventListener('mousemove', this.onPointerMove);
    this.canvas.removeEventListener('mouseup', this.onPointerUp);
    this.canvas.removeEventListener('mouseleave', this.onPointerUp);

    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
  }

  private startRenderLoop(): void {
    this.lastFrameTime = performance.now();
    this.fpsLastTime = this.lastFrameTime;

    const loop = (time: number) => {
      this.rafId = requestAnimationFrame(loop);

      const delta = time - this.lastFrameTime;
      if (delta < this.frameInterval) {
        return;
      }

      const frameCount = Math.floor(delta / this.frameInterval);
      const usedTime = frameCount * this.frameInterval;
      this.lastFrameTime += usedTime;

      this.renderFrame(time, frameCount);

      this.frameCount += frameCount;
      if (time - this.fpsLastTime >= 1000) {
        this.fps = Math.round(
          (this.frameCount * 1000) / (time - this.fpsLastTime)
        );
        this.frameCount = 0;
        this.fpsLastTime = time;
      }
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private stopRenderLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private renderFrame(_time: number, frameCount: number): void {
    if (!this.drawState.isDrawing) return;

    if (this._currentTool === 'spray') {
      this.sprayAccumTime += frameCount * this.frameInterval;
      while (this.sprayAccumTime >= this.sprayInterval) {
        this.sprayAccumTime -= this.sprayInterval;
        this.drawSpray(this.drawState.currentX, this.drawState.currentY);
      }
      return;
    }

    if (this.drawState.dirty) {
      this.drawLine(
        this.drawState.lastX,
        this.drawState.lastY,
        this.drawState.currentX,
        this.drawState.currentY
      );
      this.drawState.lastX = this.drawState.currentX;
      this.drawState.lastY = this.drawState.currentY;
      this.drawState.dirty = false;
    }
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private onPointerDown = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);
    this.startDraw(pos.x, pos.y);
  };

  private onPointerMove = (e: MouseEvent): void => {
    if (!this.drawState.isDrawing) return;
    const pos = this.getCanvasPos(e);
    this.updatePos(pos.x, pos.y);
  };

  private onPointerUp = (): void => {
    this.endDraw();
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.startDraw(
      (touch.clientX - rect.left) * scaleX,
      (touch.clientY - rect.top) * scaleY
    );
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.drawState.isDrawing) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.updatePos(
      (touch.clientX - rect.left) * scaleX,
      (touch.clientY - rect.top) * scaleY
    );
  };

  private onTouchEnd = (): void => {
    this.endDraw();
  };

  private startDraw(x: number, y: number): void {
    this.drawState.isDrawing = true;
    this.drawState.lastX = x;
    this.drawState.lastY = y;
    this.drawState.currentX = x;
    this.drawState.currentY = y;
    this.drawState.dirty = false;
    this.sprayAccumTime = 0;

    if (this._currentTool !== 'spray') {
      this.draw(x, y);
    } else {
      this.drawSpray(x, y);
    }
  }

  private updatePos(x: number, y: number): void {
    this.drawState.currentX = x;
    this.drawState.currentY = y;
    this.drawState.dirty = true;
  }

  private endDraw(): void {
    if (!this.drawState.isDrawing) return;
    this.drawState.isDrawing = false;
    this.drawState.dirty = false;
    this.saveStateAsync();
    this.notifyStrokeEnd();
  }

  private draw(x: number, y: number): void {
    switch (this._currentTool) {
      case 'brush':
        this.drawBrush(x, y);
        break;
      case 'eraser':
        this.drawEraser(x, y);
        break;
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const step = 2;
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      this.draw(x, y);
    }
  }

  private drawBrush(x: number, y: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, this._brushRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this._currentColor;
    this.ctx.fill();
  }

  private drawSpray(x: number, y: number): void {
    const area = Math.PI * this._sprayRadius * this._sprayRadius;
    const dotsPerSqPixel = 0.008;
    const dots = Math.floor(area * dotsPerSqPixel * this._sprayDensity * 10);
    this.ctx.fillStyle = this._currentColor;
    for (let i = 0; i < dots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * this._sprayRadius;
      const dx = x + r * Math.cos(angle);
      const dy = y + r * Math.sin(angle);
      this.ctx.fillRect(dx, dy, 1.5, 1.5);
    }
  }

  private drawEraser(x: number, y: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, this._eraserRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    this.ctx.restore();
  }

  private saveStateAsync(): void {
    try {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.pendingSave = imageData;
    } catch (e) {
      console.error('Failed to capture image data:', e);
      return;
    }

    if (this.saveScheduled) return;
    this.saveScheduled = true;

    const doCompress = () => {
      if (!this.pendingSave) {
        this.saveScheduled = false;
        return;
      }

      const imgData = this.pendingSave;
      this.pendingSave = null;

      try {
        this.offscreenCanvas.width = imgData.width;
        this.offscreenCanvas.height = imgData.height;
        this.offscreenCtx.putImageData(imgData, 0, 0);
        const dataUrl = this.offscreenCanvas.toDataURL('image/png');
        this.undoManager.pushState(dataUrl);
        this.notifyUndoStateChange();
      } catch (e) {
        console.error('Failed to compress state:', e);
      } finally {
        this.saveScheduled = false;
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(doCompress, { timeout: 500 });
    } else {
      setTimeout(doCompress, 0);
    }
  }

  initCanvas(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
    this.drawGrid();
    this.saveStateImmediate();
  }

  private saveStateImmediate(): void {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx.drawImage(this.canvas, 0, 0);
    const dataUrl = this.offscreenCanvas.toDataURL('image/png');
    this.undoManager.pushState(dataUrl);
    this.notifyUndoStateChange();
  }

  private drawGrid(): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    const spacing = 30;

    for (let x = 0; x <= this.canvas.width; x += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(this.canvas.width, y + 0.5);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  restoreFromDataUrl(dataUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.src = dataUrl;
    });
  }

  restoreFromImageData(_imageData: ImageData): void {
    // deprecated
  }

  async undo(): Promise<string | null> {
    const dataUrl = this.undoManager.undo();
    if (dataUrl) {
      await this.restoreFromDataUrl(dataUrl);
      this.notifyUndoStateChange();
    }
    return dataUrl;
  }

  async redo(): Promise<string | null> {
    const dataUrl = this.undoManager.redo();
    if (dataUrl) {
      await this.restoreFromDataUrl(dataUrl);
      this.notifyUndoStateChange();
    }
    return dataUrl;
  }

  toDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }

  getCanvasDataUrlForSave(
    options: {
      quality?: number;
      watermark?: string;
      format?: 'image/png' | 'image/jpeg';
    } = {}
  ): string {
    const { quality = 0.92, watermark, format = 'image/png' } = options;

    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (format === 'image/jpeg') {
      this.offscreenCtx.fillStyle = '#ffffff';
      this.offscreenCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.offscreenCtx.drawImage(this.canvas, 0, 0);

    if (watermark) {
      this.offscreenCtx.save();
      this.offscreenCtx.font = 'bold 14px sans-serif';
      this.offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.offscreenCtx.textAlign = 'right';
      this.offscreenCtx.textBaseline = 'bottom';
      this.offscreenCtx.fillText(
        watermark,
        this.canvas.width - 16,
        this.canvas.height - 12
      );
      this.offscreenCtx.restore();
    }

    return this.offscreenCanvas.toDataURL(format, quality);
  }

  resize(width: number, height: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.putImageData(imageData, 0, 0);
  }
}
