import { UndoManager } from './UndoManager';

export type ToolType = 'brush' | 'spray' | 'eraser';

interface DrawState {
  isDrawing: boolean;
  lastX: number;
  lastY: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawState: DrawState = { isDrawing: false, lastX: 0, lastY: 0 };
  private undoManager: UndoManager;
  private _currentColor: string = '#ff0000';
  private _currentTool: ToolType = 'brush';
  private _brushRadius: number = 8;
  private _eraserRadius: number = 16;
  private _sprayRadius: number = 30;
  private _sprayDensity: number = 0.3;

  constructor(canvas: HTMLCanvasElement, undoManager: UndoManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    this.undoManager = undoManager;
    this.bindEvents();
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
    this.canvas.removeEventListener('mousedown', this.onPointerDown);
    this.canvas.removeEventListener('mousemove', this.onPointerMove);
    this.canvas.removeEventListener('mouseup', this.onPointerUp);
    this.canvas.removeEventListener('mouseleave', this.onPointerUp);

    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
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
    this.continueDraw(pos.x, pos.y);
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
    this.continueDraw(
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
    this.draw(x, y);
  }

  private continueDraw(x: number, y: number): void {
    this.drawLine(this.drawState.lastX, this.drawState.lastY, x, y);
    this.drawState.lastX = x;
    this.drawState.lastY = y;
  }

  private endDraw(): void {
    if (!this.drawState.isDrawing) return;
    this.drawState.isDrawing = false;
    this.saveState();
  }

  private draw(x: number, y: number): void {
    switch (this._currentTool) {
      case 'brush':
        this.drawBrush(x, y);
        break;
      case 'spray':
        this.drawSpray(x, y);
        break;
      case 'eraser':
        this.drawEraser(x, y);
        break;
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const step = this._currentTool === 'spray' ? 4 : 2;
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
    const dots = Math.floor(area * this._sprayDensity * 0.1);
    this.ctx.fillStyle = this._currentColor;
    for (let i = 0; i < dots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this._sprayRadius;
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

  private saveState(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoManager.pushState(imageData);
  }

  initCanvas(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
    this.drawGrid();
    this.saveState();
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

  restoreFromImageData(imageData: ImageData): void {
    this.ctx.putImageData(imageData, 0, 0);
  }

  undo(): ImageData | null {
    return this.undoManager.undo();
  }

  redo(): ImageData | null {
    return this.undoManager.redo();
  }

  toDataURL(): string {
    return this.canvas.toDataURL('image/png');
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
