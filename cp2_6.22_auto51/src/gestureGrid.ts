export interface Point {
  row: number;
  col: number;
  x: number;
  y: number;
}

export type GestureSequence = Point[];

interface GridConfig {
  size: 3 | 4;
  pointRadius: number;
  pointSpacing: number;
}

const GRID_CONFIGS: Record<3 | 4, GridConfig> = {
  3: { size: 3, pointRadius: 18, pointSpacing: 80 },
  4: { size: 4, pointRadius: 14, pointSpacing: 64 }
};

const COLORS = {
  pointBorder: '#3B82F6',
  pointFill: '#3B82F6',
  lineColor: '#6366F1',
  lineWidth: 2
};

export class GestureGrid {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GridConfig;
  private points: Point[] = [];
  private selectedPoints: GestureSequence = [];
  private isDrawing: boolean = false;
  private currentMousePos: { x: number; y: number } | null = null;
  private animationId: number | null = null;
  private onGestureComplete: ((sequence: GestureSequence) => void) | null = null;
  private lineOpacity: number = 0;
  private lineOpacityTarget: number = 0;
  private isReplaying: boolean = false;
  private replayPoints: GestureSequence = [];
  private replayIndex: number = 0;
  private replayTimer: number | null = null;

  constructor(canvas: HTMLCanvasElement, initialSize: 3 | 4 = 3) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.config = GRID_CONFIGS[initialSize];
    this.initPoints();
    this.bindEvents();
    this.render();
  }

  private initPoints(): void {
    const { size, pointSpacing } = this.config;
    const totalWidth = (size - 1) * pointSpacing;
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = (this.canvas.height - totalWidth) / 2;

    this.points = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        this.points.push({
          row,
          col,
          x: startX + col * pointSpacing,
          y: startY + row * pointSpacing
        });
      }
    }
  }

  private bindEvents(): void {
    const handleStart = (clientX: number, clientY: number) => {
      if (this.isReplaying) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      const point = this.getPointAtPosition(x, y);
      if (point) {
        this.isDrawing = true;
        this.selectedPoints = [point];
        this.currentMousePos = { x, y };
        this.lineOpacityTarget = 1;
      }
    };

    const handleMove = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.currentMousePos = { x, y };

      if (this.isDrawing) {
        const point = this.getPointAtPosition(x, y);
        if (point && !this.isPointSelected(point)) {
          this.selectedPoints.push(point);
        }
      }
    };

    const handleEnd = () => {
      if (this.isDrawing && this.selectedPoints.length > 0) {
        this.isDrawing = false;
        this.currentMousePos = null;
        if (this.onGestureComplete && this.selectedPoints.length >= 2) {
          this.onGestureComplete([...this.selectedPoints]);
        }
      } else {
        this.isDrawing = false;
        this.currentMousePos = null;
      }
    };

    this.canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', handleEnd);
    this.canvas.addEventListener('mouseleave', handleEnd);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleEnd();
    }, { passive: false });
  }

  private getPointAtPosition(x: number, y: number): Point | null {
    const { pointRadius } = this.config;
    for (const point of this.points) {
      const dx = x - point.x;
      const dy = y - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= pointRadius) {
        return point;
      }
    }
    return null;
  }

  private isPointSelected(point: Point): boolean {
    return this.selectedPoints.some(p => p.row === point.row && p.col === point.col);
  }

  private render = (): void => {
    this.animationId = requestAnimationFrame(this.render);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.lineOpacity += (this.lineOpacityTarget - this.lineOpacity) * 0.15;

    this.drawLines();
    this.drawPoints();
  };

  private drawPoints(): void {
    const { pointRadius } = this.config;
    
    for (const point of this.points) {
      const isSelected = this.isPointSelected(point);
      
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
      
      if (isSelected) {
        this.ctx.fillStyle = COLORS.pointFill;
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = 'transparent';
        this.ctx.strokeStyle = COLORS.pointBorder;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }
  }

  private drawLines(): void {
    if (this.selectedPoints.length === 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = this.lineOpacity;
    this.ctx.strokeStyle = COLORS.lineColor;
    this.ctx.lineWidth = COLORS.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(this.selectedPoints[0].x, this.selectedPoints[0].y);

    for (let i = 1; i < this.selectedPoints.length; i++) {
      this.ctx.lineTo(this.selectedPoints[i].x, this.selectedPoints[i].y);
    }

    if (this.isDrawing && this.currentMousePos) {
      this.ctx.lineTo(this.currentMousePos.x, this.currentMousePos.y);
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  public setGridSize(size: 3 | 4): void {
    if (this.config.size === size) return;
    
    this.config = GRID_CONFIGS[size];
    this.selectedPoints = [];
    this.lineOpacityTarget = 0;
    this.stopReplay();
    this.initPoints();
  }

  public getGridSize(): 3 | 4 {
    return this.config.size as 3 | 4;
  }

  public setOnGestureComplete(callback: (sequence: GestureSequence) => void): void {
    this.onGestureComplete = callback;
  }

  public reset(): void {
    this.selectedPoints = [];
    this.lineOpacityTarget = 0;
    this.stopReplay();
  }

  public replay(sequence: GestureSequence, gridSize: 3 | 4): void {
    if (gridSize !== this.config.size) {
      this.setGridSize(gridSize);
    }

    this.stopReplay();
    this.isReplaying = true;
    this.replayPoints = [...sequence];
    this.replayIndex = 0;
    this.selectedPoints = [];
    this.lineOpacityTarget = 1;

    this.playNextSegment();
  }

  private playNextSegment = (): void => {
    if (this.replayIndex < this.replayPoints.length) {
      this.selectedPoints.push(this.replayPoints[this.replayIndex]);
      this.replayIndex++;
      this.replayTimer = window.setTimeout(this.playNextSegment, 200);
    } else {
      this.isReplaying = false;
    }
  };

  private stopReplay(): void {
    if (this.replayTimer) {
      clearTimeout(this.replayTimer);
      this.replayTimer = null;
    }
    this.isReplaying = false;
    this.replayPoints = [];
    this.replayIndex = 0;
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.stopReplay();
  }

  public getCurrentSequence(): GestureSequence {
    return [...this.selectedPoints];
  }
}
