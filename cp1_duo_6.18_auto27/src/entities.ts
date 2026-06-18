import { Vec2, Environment } from './environment.js';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FISH_RADIUS,
  FISH_COLOR,
  JELLYFISH_RADIUS,
  JELLYFISH_COLOR,
  JELLYFISH_DRIFT_SPEED,
  TURTLE_RADIUS,
  TURTLE_COLOR,
  TURTLE_CATCH_RANGE,
  TURTLE_PATROL_SPEED,
  BOID_COHESION_WEIGHT,
  BOID_ALIGNMENT_WEIGHT,
  BOID_SEPARATION_WEIGHT,
  BOID_PERCEPTION_RADIUS,
  FISH_TRAIL_WIDTH,
  FISH_TRAIL_LENGTH,
  JELLYFISH_TRAIL_WIDTH,
  JELLYFISH_TRAIL_LENGTH,
  TURTLE_TRAIL_WIDTH,
  TURTLE_TRAIL_LENGTH,
  GlobalParams,
  DEFAULT_PARAMS,
} from './config.js';

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function mag(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: Vec2): Vec2 {
  const m = mag(v);
  if (m === 0) return { x: 0, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

function limit(v: Vec2, max: number): Vec2 {
  const m = mag(v);
  if (m > max) {
    return { x: (v.x / m) * max, y: (v.y / m) * max };
  }
  return v;
}

interface TrailPoint {
  x: number;
  y: number;
}

export class Fish {
  pos: Vec2;
  vel: Vec2;
  acc: Vec2;
  alive: boolean = true;
  trail: TrailPoint[] = [];
  id: number;
  private static nextId = 0;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    this.vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    this.acc = { x: 0, y: 0 };
    this.id = Fish.nextId++;
  }

  update(fishes: Fish[], turtles: Turtle[], env: Environment, params: GlobalParams): void {
    if (!this.alive) return;

    const cohesion = this.cohesion(fishes);
    const alignment = this.alignment(fishes);
    const separation = this.separation(fishes, params.fishSeparation);
    const avoidance = this.avoidTurtles(turtles);
    const obstacleForce = env.getObstacleAvoidanceForce(this.pos, this.vel);
    const boundaryForce = this.boundaryForce();

    this.acc.x = 0;
    this.acc.y = 0;
    this.acc.x += cohesion.x * BOID_COHESION_WEIGHT;
    this.acc.y += cohesion.y * BOID_COHESION_WEIGHT;
    this.acc.x += alignment.x * BOID_ALIGNMENT_WEIGHT;
    this.acc.y += alignment.y * BOID_ALIGNMENT_WEIGHT;
    this.acc.x += separation.x * BOID_SEPARATION_WEIGHT;
    this.acc.y += separation.y * BOID_SEPARATION_WEIGHT;
    this.acc.x += avoidance.x * 0.3;
    this.acc.y += avoidance.y * 0.3;
    this.acc.x += obstacleForce.x;
    this.acc.y += obstacleForce.y;
    this.acc.x += boundaryForce.x * 0.5;
    this.acc.y += boundaryForce.y * 0.5;

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.vel = limit(this.vel, params.fishMaxSpeed);

    const speed = mag(this.vel);
    if (speed < 0.5) {
      this.vel = normalize(this.vel);
      this.vel.x *= 0.5;
      this.vel.y *= 0.5;
    }

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    this.pos.x = Math.max(FISH_RADIUS, Math.min(CANVAS_WIDTH - FISH_RADIUS, this.pos.x));
    this.pos.y = Math.max(FISH_RADIUS, Math.min(CANVAS_HEIGHT - FISH_RADIUS, this.pos.y));

    this.trail.unshift({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > FISH_TRAIL_LENGTH) {
      this.trail.pop();
    }
  }

  private cohesion(fishes: Fish[]): Vec2 {
    let cx = 0, cy = 0, count = 0;
    for (const f of fishes) {
      if (f === this || !f.alive) continue;
      if (dist(this.pos, f.pos) < BOID_PERCEPTION_RADIUS) {
        cx += f.pos.x;
        cy += f.pos.y;
        count++;
      }
    }
    if (count === 0) return { x: 0, y: 0 };
    cx /= count;
    cy /= count;
    return { x: cx - this.pos.x, y: cy - this.pos.y };
  }

  private alignment(fishes: Fish[]): Vec2 {
    let vx = 0, vy = 0, count = 0;
    for (const f of fishes) {
      if (f === this || !f.alive) continue;
      if (dist(this.pos, f.pos) < BOID_PERCEPTION_RADIUS) {
        vx += f.vel.x;
        vy += f.vel.y;
        count++;
      }
    }
    if (count === 0) return { x: 0, y: 0 };
    vx /= count;
    vy /= count;
    return { x: vx - this.vel.x, y: vy - this.vel.y };
  }

  private separation(fishes: Fish[], separationDist: number): Vec2 {
    let sx = 0, sy = 0, count = 0;
    for (const f of fishes) {
      if (f === this || !f.alive) continue;
      const d = dist(this.pos, f.pos);
      if (d < separationDist && d > 0) {
        const dx = this.pos.x - f.pos.x;
        const dy = this.pos.y - f.pos.y;
        sx += dx / d;
        sy += dy / d;
        count++;
      }
    }
    if (count === 0) return { x: 0, y: 0 };
    return { x: sx / count, y: sy / count };
  }

  private avoidTurtles(turtles: Turtle[]): Vec2 {
    let sx = 0, sy = 0;
    for (const t of turtles) {
      const d = dist(this.pos, t.pos);
      if (d < 100 && d > 0) {
        const dx = this.pos.x - t.pos.x;
        const dy = this.pos.y - t.pos.y;
        const force = (100 - d) / 100;
        sx += (dx / d) * force * 3;
        sy += (dy / d) * force * 3;
      }
    }
    return { x: sx, y: sy };
  }

  private boundaryForce(): Vec2 {
    let fx = 0, fy = 0;
    const margin = 50;
    if (this.pos.x < margin) fx += (margin - this.pos.x) / margin;
    if (this.pos.x > CANVAS_WIDTH - margin) fx -= (this.pos.x - (CANVAS_WIDTH - margin)) / margin;
    if (this.pos.y < margin) fy += (margin - this.pos.y) / margin;
    if (this.pos.y > CANVAS_HEIGHT - margin) fy -= (this.pos.y - (CANVAS_HEIGHT - margin)) / margin;
    return { x: fx, y: fy };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    this.renderTrail(ctx);

    ctx.save();
    const angle = Math.atan2(this.vel.y, this.vel.x);
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.ellipse(0, 0, FISH_RADIUS * 1.3, FISH_RADIUS * 0.7, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-2, 0, 0, 0, 0, FISH_RADIUS * 1.3);
    grad.addColorStop(0, '#7abfff');
    grad.addColorStop(1, FISH_COLOR);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(FISH_RADIUS * 0.8, 0);
    ctx.lineTo(FISH_RADIUS * 1.6, -FISH_RADIUS * 0.5);
    ctx.lineTo(FISH_RADIUS * 1.6, FISH_RADIUS * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#3a8aef';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(FISH_RADIUS * 0.5, -FISH_RADIUS * 0.2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  private renderTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;
    ctx.save();
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = (1 - i / this.trail.length) * 0.27;
      ctx.beginPath();
      ctx.moveTo(this.trail[i].x, this.trail[i].y);
      ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = FISH_TRAIL_WIDTH * (1 - i / this.trail.length);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Jellyfish {
  pos: Vec2;
  vel: Vec2;
  pulsePhase: number;
  pulseSpeed: number;
  trail: TrailPoint[] = [];

  constructor(x: number, y: number) {
    this.pos = { x, y };
    const angle = Math.random() * Math.PI * 2;
    this.vel = { x: Math.cos(angle) * JELLYFISH_DRIFT_SPEED, y: Math.sin(angle) * JELLYFISH_DRIFT_SPEED };
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.03 + Math.random() * 0.02;
  }

  update(env: Environment): void {
    this.pulsePhase += this.pulseSpeed;

    this.vel.x += (Math.random() - 0.5) * 0.05;
    this.vel.y += (Math.random() - 0.5) * 0.05;
    this.vel.y += Math.sin(this.pulsePhase) * 0.02;

    this.vel = limit(this.vel, JELLYFISH_DRIFT_SPEED);

    const obstacleForce = env.getObstacleAvoidanceForce(this.pos, this.vel);
    this.vel.x += obstacleForce.x * 0.5;
    this.vel.y += obstacleForce.y * 0.5;

    const bf = this.boundaryForce();
    this.vel.x += bf.x * 0.3;
    this.vel.y += bf.y * 0.3;

    this.vel = limit(this.vel, JELLYFISH_DRIFT_SPEED);

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    this.pos.x = Math.max(JELLYFISH_RADIUS, Math.min(CANVAS_WIDTH - JELLYFISH_RADIUS, this.pos.x));
    this.pos.y = Math.max(JELLYFISH_RADIUS, Math.min(CANVAS_HEIGHT - JELLYFISH_RADIUS, this.pos.y));

    this.trail.unshift({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > JELLYFISH_TRAIL_LENGTH) {
      this.trail.pop();
    }
  }

  private boundaryForce(): Vec2 {
    let fx = 0, fy = 0;
    const margin = 40;
    if (this.pos.x < margin) fx += (margin - this.pos.x) / margin;
    if (this.pos.x > CANVAS_WIDTH - margin) fx -= (this.pos.x - (CANVAS_WIDTH - margin)) / margin;
    if (this.pos.y < margin) fy += (margin - this.pos.y) / margin;
    if (this.pos.y > CANVAS_HEIGHT - margin) fy -= (this.pos.y - (CANVAS_HEIGHT - margin)) / margin;
    return { x: fx, y: fy };
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderTrail(ctx);

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15;
    const squash = 1 + Math.sin(this.pulsePhase) * 0.08;

    ctx.scale(pulseScale / squash, 1 / pulseScale * squash);

    ctx.beginPath();
    ctx.arc(0, 0, JELLYFISH_RADIUS, Math.PI, 0, false);
    ctx.quadraticCurveTo(JELLYFISH_RADIUS, JELLYFISH_RADIUS * 0.3, 0, JELLYFISH_RADIUS * 0.5);
    ctx.quadraticCurveTo(-JELLYFISH_RADIUS, JELLYFISH_RADIUS * 0.3, -JELLYFISH_RADIUS, 0);
    const grad = ctx.createRadialGradient(0, -3, 0, 0, 0, JELLYFISH_RADIUS);
    grad.addColorStop(0, 'rgba(255, 180, 200, 0.5)');
    grad.addColorStop(0.5, 'rgba(255, 130, 170, 0.35)');
    grad.addColorStop(1, 'rgba(255, 100, 150, 0.2)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 150, 180, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
      const tx = -6 + i * 3;
      const tentLen = 10 + Math.sin(this.pulsePhase + i) * 5;
      ctx.beginPath();
      ctx.moveTo(tx, JELLYFISH_RADIUS * 0.4);
      ctx.quadraticCurveTo(
        tx + Math.sin(this.pulsePhase + i * 0.5) * 3,
        JELLYFISH_RADIUS * 0.4 + tentLen * 0.5,
        tx + Math.sin(this.pulsePhase + i) * 4,
        JELLYFISH_RADIUS * 0.4 + tentLen
      );
      ctx.strokeStyle = 'rgba(255, 150, 180, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;
    ctx.save();
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = (1 - i / this.trail.length) * 0.15;
      ctx.beginPath();
      ctx.moveTo(this.trail[i].x, this.trail[i].y);
      ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = JELLYFISH_TRAIL_WIDTH * (1 - i / this.trail.length);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Turtle {
  pos: Vec2;
  vel: Vec2;
  patrolPoints: Vec2[];
  currentPatrolIndex: number = 0;
  catchCount: number = 0;
  targetFish: Fish | null = null;
  trail: TrailPoint[] = [];
  facingAngle: number = 0;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.vel = { x: TURTLE_PATROL_SPEED, y: 0 };
    this.patrolPoints = this.generatePatrolPath();
    this.facingAngle = 0;
  }

  private generatePatrolPath(): Vec2[] {
    const points: Vec2[] = [];
    const numPoints = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: 80 + Math.random() * (CANVAS_WIDTH - 160),
        y: 80 + Math.random() * (CANVAS_HEIGHT - 160),
      });
    }
    return points;
  }

  update(fishes: Fish[], env: Environment): void {
    this.targetFish = null;
    let closestDist = TURTLE_CATCH_RANGE * 3;
    for (const f of fishes) {
      if (!f.alive) continue;
      const d = dist(this.pos, f.pos);
      if (d < closestDist) {
        closestDist = d;
        this.targetFish = f;
      }
    }

    let targetX: number, targetY: number;
    if (this.targetFish && closestDist < TURTLE_CATCH_RANGE * 3) {
      targetX = this.targetFish.pos.x;
      targetY = this.targetFish.pos.y;
    } else {
      const patrol = this.patrolPoints[this.currentPatrolIndex];
      targetX = patrol.x;
      targetY = patrol.y;
      const d = dist(this.pos, patrol);
      if (d < 20) {
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      }
    }

    const dx = targetX - this.pos.x;
    const dy = targetY - this.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    let speed = TURTLE_PATROL_SPEED;
    if (this.targetFish && closestDist < TURTLE_CATCH_RANGE * 3) {
      speed = TURTLE_PATROL_SPEED * 1.5;
    }

    if (d > 0) {
      this.vel.x += (dx / d) * 0.1;
      this.vel.y += (dy / d) * 0.1;
    }

    this.vel = limit(this.vel, speed);

    const obstacleForce = env.getObstacleAvoidanceForce(this.pos, this.vel);
    this.vel.x += obstacleForce.x * 0.3;
    this.vel.y += obstacleForce.y * 0.3;

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    this.pos.x = Math.max(TURTLE_RADIUS, Math.min(CANVAS_WIDTH - TURTLE_RADIUS, this.pos.x));
    this.pos.y = Math.max(TURTLE_RADIUS, Math.min(CANVAS_HEIGHT - TURTLE_RADIUS, this.pos.y));

    if (this.targetFish) {
      const catchDist = dist(this.pos, this.targetFish.pos);
      if (catchDist < TURTLE_CATCH_RANGE) {
        this.targetFish.alive = false;
        this.catchCount++;
        this.targetFish = null;
      }
    }

    if (mag(this.vel) > 0.1) {
      this.facingAngle = Math.atan2(this.vel.y, this.vel.x);
    }

    this.trail.unshift({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > TURTLE_TRAIL_LENGTH) {
      this.trail.pop();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderTrail(ctx);

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.facingAngle);

    ctx.beginPath();
    ctx.ellipse(0, 0, TURTLE_RADIUS * 1.2, TURTLE_RADIUS * 0.8, 0, 0, Math.PI * 2);
    const shellGrad = ctx.createRadialGradient(-3, -3, 0, 0, 0, TURTLE_RADIUS * 1.2);
    shellGrad.addColorStop(0, '#45d98a');
    shellGrad.addColorStop(0.6, TURTLE_COLOR);
    shellGrad.addColorStop(1, '#1a8a4a');
    ctx.fillStyle = shellGrad;
    ctx.fill();
    ctx.strokeStyle = '#1a7a3a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-3, -TURTLE_RADIUS * 0.5);
    ctx.lineTo(-3, TURTLE_RADIUS * 0.5);
    ctx.moveTo(4, -TURTLE_RADIUS * 0.5);
    ctx.lineTo(4, TURTLE_RADIUS * 0.5);
    ctx.moveTo(-8, 0);
    ctx.lineTo(8, 0);
    ctx.strokeStyle = 'rgba(26, 120, 50, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(TURTLE_RADIUS * 1.1, 0, TURTLE_RADIUS * 0.4, TURTLE_RADIUS * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5ae09a';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(TURTLE_RADIUS * 1.35, -1.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    const flipperAngle = Math.sin(Date.now() * 0.005) * 0.3;
    ctx.save();
    ctx.rotate(flipperAngle - 0.5);
    ctx.beginPath();
    ctx.ellipse(TURTLE_RADIUS * 0.3, -TURTLE_RADIUS * 0.7, TURTLE_RADIUS * 0.5, TURTLE_RADIUS * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5ae09a';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(-flipperAngle + 0.5);
    ctx.beginPath();
    ctx.ellipse(TURTLE_RADIUS * 0.3, TURTLE_RADIUS * 0.7, TURTLE_RADIUS * 0.5, TURTLE_RADIUS * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5ae09a';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  private renderTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;
    ctx.save();
    for (let i = 0; i < this.trail.length - 1; i++) {
      const alpha = (1 - i / this.trail.length) * 0.25;
      ctx.beginPath();
      ctx.moveTo(this.trail[i].x, this.trail[i].y);
      ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = TURTLE_TRAIL_WIDTH * (1 - i / this.trail.length);
      ctx.stroke();
    }
    ctx.restore();
  }
}
