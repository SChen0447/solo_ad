export interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export interface SwordDirection {
  dx: number;
  dy: number;
  speed: number;
  direction: string;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private swordPosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  private trailPoints: TrailPoint[] = [];
  private isSwinging: boolean = false;
  private maxTrailLength: number = 15;
  private trailLifetime: number = 200;
  private direction: { dx: number; dy: number; speed: number } = { dx: 0, dy: 0, speed: 0 };
  private lastUpdateTime: number = 0;
  private pendingPosition: { x: number; y: number } | null = null;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
  }

  private getCanvasCoordinates(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const pos = this.getCanvasCoordinates(e.clientX, e.clientY);
    this.startSwing(pos);
  }

  private handleMouseMove(e: MouseEvent): void {
    e.preventDefault();
    const pos = this.getCanvasCoordinates(e.clientX, e.clientY);
    this.updatePosition(pos);
  }

  private handleMouseUp(e: MouseEvent): void {
    e.preventDefault();
    this.endSwing();
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const pos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
      this.startSwing(pos);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const pos = this.getCanvasCoordinates(touch.clientX, touch.clientY);
      this.updatePosition(pos);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.endSwing();
  }

  private startSwing(pos: { x: number; y: number }): void {
    this.isSwinging = true;
    this.swordPosition = { ...pos };
    this.lastPosition = { ...pos };
    this.trailPoints = [];
    this.addTrailPoint(pos);
  }

  private updatePosition(pos: { x: number; y: number }): void {
    this.pendingPosition = { ...pos };
  }

  private endSwing(): void {
    this.isSwinging = false;
    this.direction = { dx: 0, dy: 0, speed: 0 };
  }

  private startAnimationLoop(): void {
    const loop = () => {
      if (this.pendingPosition) {
        this.processPositionUpdate(this.pendingPosition);
        this.pendingPosition = null;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private processPositionUpdate(pos: { x: number; y: number }): void {
    const now = performance.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    if (deltaTime > 0) {
      const dx = pos.x - this.lastPosition.x;
      const dy = pos.y - this.lastPosition.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / deltaTime;

      this.direction = {
        dx: dx !== 0 ? dx / Math.abs(dx) : 0,
        dy: dy !== 0 ? dy / Math.abs(dy) : 0,
        speed
      };
    }

    this.swordPosition = { ...pos };
    this.lastPosition = { ...pos };

    if (this.isSwinging) {
      this.addTrailPoint(pos);
    }
  }

  private addTrailPoint(pos: { x: number; y: number }): void {
    this.trailPoints.push({
      x: pos.x,
      y: pos.y,
      time: performance.now()
    });

    if (this.trailPoints.length > this.maxTrailLength) {
      this.trailPoints.shift();
    }
  }

  update(_deltaTime: number): void {
    const now = performance.now();
    this.trailPoints = this.trailPoints.filter(
      point => now - point.time < this.trailLifetime
    );

    if (!this.isSwinging) {
      this.trailPoints = [];
    }
  }

  getSwordPosition(): { x: number; y: number } {
    return { ...this.swordPosition };
  }

  getSwordDirection(): SwordDirection {
    let direction = 'none';
    
    if (Math.abs(this.direction.dx) > Math.abs(this.direction.dy)) {
      if (this.direction.dx > 0) direction = 'right';
      else if (this.direction.dx < 0) direction = 'left';
    } else {
      if (this.direction.dy > 0) direction = 'down';
      else if (this.direction.dy < 0) direction = 'up';
    }

    return {
      dx: this.direction.dx,
      dy: this.direction.dy,
      speed: this.direction.speed,
      direction
    };
  }

  getTrailPoints(): TrailPoint[] {
    return [...this.trailPoints];
  }

  getIsSwinging(): boolean {
    return this.isSwinging;
  }

  getSwordSegment(): { x1: number; y1: number; x2: number; y2: number } | null {
    if (this.trailPoints.length < 2) {
      return null;
    }

    const recent = this.trailPoints.slice(-5);
    return {
      x1: recent[0].x,
      y1: recent[0].y,
      x2: recent[recent.length - 1].x,
      y2: recent[recent.length - 1].y
    };
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
