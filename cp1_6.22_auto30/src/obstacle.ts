import type { Mass, SoftBody } from './softbody';

export type ObstacleType = 'rect' | 'circle';

export interface Obstacle {
  type: ObstacleType;
  draw(ctx: CanvasRenderingContext2D): void;
  resolveCollision(mass: Mass, pressure: number): boolean;
  checkCollisionWithSoftBody(body: SoftBody): boolean;
}

export class RectObstacle implements Obstacle {
  public type: ObstacleType = 'rect';
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public color: string;

  constructor(x: number, y: number, width: number, height: number, color: string = '#4488ff') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    ctx.restore();
  }

  resolveCollision(mass: Mass, pressure: number): boolean {
    if (mass.pinned) return false;

    const left = this.x - this.width / 2;
    const right = this.x + this.width / 2;
    const top = this.y - this.height / 2;
    const bottom = this.y + this.height / 2;

    const closestX = Math.max(left, Math.min(mass.x, right));
    const closestY = Math.max(top, Math.min(mass.y, bottom));

    const dx = mass.x - closestX;
    const dy = mass.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const radius = 5 + pressure * 5;

    if (dist < radius && dist > 0) {
      const overlap = radius - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      mass.x += nx * overlap;
      mass.y += ny * overlap;

      const vx = mass.x - mass.oldX;
      const vy = mass.y - mass.oldY;
      const dot = vx * nx + vy * ny;
      
      if (dot < 0) {
        const bounce = 0.3;
        mass.oldX = mass.x - (vx - 2 * dot * nx * bounce);
        mass.oldY = mass.y - (vy - 2 * dot * ny * bounce);
      }

      return true;
    }

    return false;
  }

  checkCollisionWithSoftBody(body: SoftBody): boolean {
    let collided = false;
    
    for (const mass of body.masses) {
      if (this.resolveCollision(mass, body.params.pressure)) {
        collided = true;
      }
    }

    return collided;
  }
}

export class CircleObstacle implements Obstacle {
  public type: ObstacleType = 'circle';
  public x: number;
  public y: number;
  public radius: number;
  public color: string;

  constructor(x: number, y: number, radius: number, color: string = '#ff4444') {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  resolveCollision(mass: Mass, pressure: number): boolean {
    if (mass.pinned) return false;

    const dx = mass.x - this.x;
    const dy = mass.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const massRadius = 3 + pressure * 5;
    const minDist = this.radius + massRadius;

    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;

      mass.x += nx * overlap;
      mass.y += ny * overlap;

      const vx = mass.x - mass.oldX;
      const vy = mass.y - mass.oldY;
      const dot = vx * nx + vy * ny;
      
      if (dot < 0) {
        const bounce = 0.3;
        mass.oldX = mass.x - (vx - 2 * dot * nx * bounce);
        mass.oldY = mass.y - (vy - 2 * dot * ny * bounce);
      }

      return true;
    }

    return false;
  }

  checkCollisionWithSoftBody(body: SoftBody): boolean {
    let collided = false;
    
    for (const mass of body.masses) {
      if (this.resolveCollision(mass, body.params.pressure)) {
        collided = true;
      }
    }

    return collided;
  }
}
