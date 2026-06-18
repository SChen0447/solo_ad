import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CORAL_COUNT,
  CORAL_MIN_SIZE,
  CORAL_MAX_SIZE,
  CORAL_ORANGE,
  SEAWEED_COUNT,
  SEAWEED_MIN_HEIGHT,
  SEAWEED_MAX_HEIGHT,
  SEAWEED_GREEN,
  OBSTACLE_AVOIDANCE_RADIUS,
} from './config.js';

export interface Vec2 {
  x: number;
  y: number;
}

export interface CoralReef {
  x: number;
  y: number;
  size: number;
  points: Vec2[];
}

export interface SeaweedStrand {
  x: number;
  baseY: number;
  height: number;
  width: number;
  swayOffset: number;
  swaySpeed: number;
}

export class Environment {
  corals: CoralReef[] = [];
  seaweeds: SeaweedStrand[] = [];

  constructor() {
    this.generateCorals();
    this.generateSeaweeds();
  }

  private generateCorals(): void {
    this.corals = [];
    for (let i = 0; i < CORAL_COUNT; i++) {
      const size = CORAL_MIN_SIZE + Math.random() * (CORAL_MAX_SIZE - CORAL_MIN_SIZE);
      const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
      const y = CANVAS_HEIGHT - 30 - Math.random() * 80;
      const points = this.generateCoralShape(x, y, size);
      this.corals.push({ x, y, size, points });
    }
  }

  private generateCoralShape(cx: number, cy: number, size: number): Vec2[] {
    const points: Vec2[] = [];
    const numPoints = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numPoints; i++) {
      const angle = (Math.PI * 2 * i) / numPoints + (Math.random() - 0.5) * 0.5;
      const r = size * 0.5 + Math.random() * size * 0.4;
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * 0.7,
      });
    }
    return points;
  }

  private generateSeaweeds(): void {
    this.seaweeds = [];
    for (let i = 0; i < SEAWEED_COUNT; i++) {
      this.seaweeds.push({
        x: 30 + Math.random() * (CANVAS_WIDTH - 60),
        baseY: CANVAS_HEIGHT,
        height: SEAWEED_MIN_HEIGHT + Math.random() * (SEAWEED_MAX_HEIGHT - SEAWEED_MIN_HEIGHT),
        width: 3 + Math.random() * 3,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.02,
      });
    }
  }

  getObstacleAvoidanceForce(pos: Vec2, vel: Vec2): Vec2 {
    let steerX = 0;
    let steerY = 0;

    for (const coral of this.corals) {
      const dx = pos.x - coral.x;
      const dy = pos.y - coral.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const avoidDist = coral.size * 0.5 + OBSTACLE_AVOIDANCE_RADIUS;

      if (dist < avoidDist && dist > 0) {
        const force = (avoidDist - dist) / avoidDist;
        steerX += (dx / dist) * force * 2;
        steerY += (dy / dist) * force * 2;
      }
    }

    for (const seaweed of this.seaweeds) {
      const dx = pos.x - seaweed.x;
      const dy = pos.y - (seaweed.baseY - seaweed.height * 0.5);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const avoidDist = seaweed.height * 0.4 + OBSTACLE_AVOIDANCE_RADIUS;

      if (dist < avoidDist && dist > 0) {
        const force = (avoidDist - dist) / avoidDist;
        steerX += (dx / dist) * force * 1.5;
        steerY += (dy / dist) * force * 1.5;
      }
    }

    return { x: steerX, y: steerY };
  }

  isNearObstacle(x: number, y: number, radius: number): boolean {
    for (const coral of this.corals) {
      const dx = x - coral.x;
      const dy = y - coral.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < coral.size * 0.5 + radius) return true;
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    for (const coral of this.corals) {
      this.renderCoral(ctx, coral);
    }
    for (const seaweed of this.seaweeds) {
      this.renderSeaweed(ctx, seaweed, time);
    }
  }

  private renderCoral(ctx: CanvasRenderingContext2D, coral: CoralReef): void {
    ctx.save();
    ctx.beginPath();
    if (coral.points.length > 0) {
      ctx.moveTo(coral.points[0].x, coral.points[0].y);
      for (let i = 1; i < coral.points.length; i++) {
        const prev = coral.points[i - 1];
        const curr = coral.points[i];
        const cpx = (prev.x + curr.x) / 2;
        const cpy = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
      }
      ctx.closePath();
    }
    const grad = ctx.createRadialGradient(coral.x, coral.y, 0, coral.x, coral.y, coral.size * 0.6);
    grad.addColorStop(0, '#ff9a76');
    grad.addColorStop(1, CORAL_ORANGE);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#e06840';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private renderSeaweed(ctx: CanvasRenderingContext2D, sw: SeaweedStrand, time: number): void {
    ctx.save();
    const sway = Math.sin(time * sw.swaySpeed + sw.swayOffset) * 8;
    const segments = 6;
    ctx.beginPath();
    ctx.moveTo(sw.x, sw.baseY);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const sx = sw.x + sway * t * t;
      const sy = sw.baseY - sw.height * t;
      ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = SEAWEED_GREEN;
    ctx.lineWidth = sw.width;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.8;
    ctx.stroke();

    ctx.beginPath();
    const tipX = sw.x + sway;
    const tipY = sw.baseY - sw.height;
    ctx.ellipse(tipX, tipY, sw.width * 1.2, sw.width * 2, sway * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#2ea52e';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.restore();
  }
}
