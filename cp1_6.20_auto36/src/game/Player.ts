import type { GravityDirection } from '../utils/InputHandler';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  gravityDirection: GravityDirection;
  gravityStrength: number;
  trail: TrailPoint[];
  squishProgress: number;
  squishDirection: GravityDirection | null;
}

export class Player {
  public state: PlayerState;
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly TRAIL_LENGTH = 10;
  private readonly SQUISH_DURATION = 200;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = {
      x: canvasWidth * 0.25,
      y: canvasHeight * 0.5,
      vx: 0,
      vy: 0,
      radius: 18,
      gravityDirection: 'down',
      gravityStrength: 0.6,
      trail: [],
      squishProgress: 0,
      squishDirection: null
    };
  }

  public setGravityDirection(direction: GravityDirection): void {
    if (this.state.gravityDirection !== direction) {
      this.state.gravityDirection = direction;
      this.state.squishDirection = direction;
      this.state.squishProgress = 0;
      this.state.vx = 0;
      this.state.vy = 0;
    }
  }

  public update(deltaTime: number, scrollSpeed: number): void {
    const gravity = this.state.gravityStrength;

    switch (this.state.gravityDirection) {
      case 'up':
        this.state.vy -= gravity;
        break;
      case 'down':
        this.state.vy += gravity;
        break;
      case 'left':
        this.state.vx -= gravity;
        break;
      case 'right':
        this.state.vx += gravity;
        break;
    }

    this.state.vx *= 0.98;
    this.state.vy *= 0.98;

    const maxSpeed = 12;
    const speed = Math.sqrt(this.state.vx ** 2 + this.state.vy ** 2);
    if (speed > maxSpeed) {
      this.state.vx = (this.state.vx / speed) * maxSpeed;
      this.state.vy = (this.state.vy / speed) * maxSpeed;
    }

    this.state.x += this.state.vx;
    this.state.y += this.state.vy;

    const r = this.state.radius;
    if (this.state.x - r < 0) { this.state.x = r; this.state.vx = 0; }
    if (this.state.x + r > this.canvasWidth) { this.state.x = this.canvasWidth - r; this.state.vx = 0; }
    if (this.state.y - r < 0) { this.state.y = r; this.state.vy = 0; }
    if (this.state.y + r > this.canvasHeight) { this.state.y = this.canvasHeight - r; this.state.vy = 0; }

    this.state.trail.unshift({ x: this.state.x, y: this.state.y, alpha: 1 });
    if (this.state.trail.length > this.TRAIL_LENGTH) {
      this.state.trail.pop();
    }
    this.state.trail.forEach((point, i) => {
      point.alpha = 1 - (i / this.TRAIL_LENGTH);
    });

    if (this.state.squishDirection !== null) {
      this.state.squishProgress += deltaTime;
      if (this.state.squishProgress >= this.SQUISH_DURATION) {
        this.state.squishProgress = 0;
        this.state.squishDirection = null;
      }
    }
  }

  public getSquishScale(): { scaleX: number; scaleY: number } {
    if (this.state.squishDirection === null) {
      return { scaleX: 1, scaleY: 1 };
    }
    const t = this.state.squishProgress / 200;
    const squishAmount = Math.sin(t * Math.PI) * 0.3;
    const isVertical = this.state.squishDirection === 'up' || this.state.squishDirection === 'down';
    return {
      scaleX: isVertical ? 1 + squishAmount : 1 - squishAmount,
      scaleY: isVertical ? 1 - squishAmount : 1 + squishAmount
    };
  }

  public getAABB(): { minX: number; maxX: number; minY: number; maxY: number } {
    const r = this.state.radius * 0.7;
    return {
      minX: this.state.x - r,
      maxX: this.state.x + r,
      minY: this.state.y - r,
      maxY: this.state.y + r
    };
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
