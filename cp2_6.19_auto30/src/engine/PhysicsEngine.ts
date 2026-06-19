import { BallManager, Ball } from './BallManager';
import { TableGeometry, Pocket } from './TableGeometry';

export interface PocketEvent {
  ball: Ball;
  pocket: Pocket;
}

export class PhysicsEngine {
  private ballManager: BallManager;
  private geometry: TableGeometry;
  private readonly friction: number = 0.992;
  private readonly minSpeed: number = 0.05;
  private readonly restitution: number = 0.98;
  private pocketEventsThisFrame: PocketEvent[] = [];
  private lastTime: number = 0;
  private readonly fpsInterval: number = 1000 / 60;

  constructor(ballManager: BallManager, geometry: TableGeometry) {
    this.ballManager = ballManager;
    this.geometry = geometry;
  }

  step(currentTime: number): PocketEvent[] {
    this.pocketEventsThisFrame = [];

    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      return this.pocketEventsThisFrame;
    }

    const elapsed = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const steps = Math.min(Math.max(Math.round(elapsed / this.fpsInterval), 1), 3);
    const dt = 1;

    for (let s = 0; s < steps; s++) {
      this.simulateStep(dt);
    }

    return this.pocketEventsThisFrame;
  }

  private simulateStep(dt: number): void {
    const balls = this.ballManager.getBalls();

    for (const ball of balls) {
      if (ball.isPotted) continue;
      this.ballManager.updateBallPosition(ball, dt);
      this.applyFriction(ball);
      this.handleWallCollision(ball);
      this.checkPocketCollision(ball);
    }

    this.handleBallCollisions();
  }

  private applyFriction(ball: Ball): void {
    ball.vx *= this.friction;
    ball.vy *= this.friction;
    if (Math.abs(ball.vx) < this.minSpeed) ball.vx = 0;
    if (Math.abs(ball.vy) < this.minSpeed) ball.vy = 0;
  }

  private handleWallCollision(ball: Ball): void {
    const { left, right, top, bottom } = this.geometry.bounds;
    const r = ball.radius;

    if (ball.x - r < left) {
      ball.x = left + r;
      ball.vx = -ball.vx * this.restitution;
    }
    if (ball.x + r > right) {
      ball.x = right - r;
      ball.vx = -ball.vx * this.restitution;
    }
    if (ball.y - r < top) {
      ball.y = top + r;
      ball.vy = -ball.vy * this.restitution;
    }
    if (ball.y + r > bottom) {
      ball.y = bottom - r;
      ball.vy = -ball.vy * this.restitution;
    }
  }

  private checkPocketCollision(ball: Ball): void {
    if (ball.isPotted) return;

    for (const pocket of this.geometry.pockets) {
      const dx = ball.x - pocket.x;
      const dy = ball.y - pocket.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < pocket.radius) {
        this.ballManager.potBall(ball);
        this.pocketEventsThisFrame.push({ ball, pocket });
        return;
      }
    }
  }

  private handleBallCollisions(): void {
    const balls = this.ballManager.getBalls().filter(b => !b.isPotted);

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        this.resolveBallCollision(balls[i], balls[j]);
      }
    }
  }

  private resolveBallCollision(a: Ball, b: Ball): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = a.radius + b.radius;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0 || dist >= minDist) return;

    const nx = dx / dist;
    const ny = dy / dist;

    const overlap = minDist - dist;
    const halfOverlap = overlap / 2;
    a.x -= nx * halfOverlap;
    a.y -= ny * halfOverlap;
    b.x += nx * halfOverlap;
    b.y += ny * halfOverlap;

    const dvx = a.vx - b.vx;
    const dvy = a.vy - b.vy;
    const dvDotN = dvx * nx + dvy * ny;

    if (dvDotN <= 0) return;

    const impulse = dvDotN * this.restitution;

    a.vx -= impulse * nx;
    a.vy -= impulse * ny;
    b.vx += impulse * nx;
    b.vy += impulse * ny;
  }

  strikeCueBall(directionX: number, directionY: number, power: number): void {
    const cue = this.ballManager.getCueBall();
    if (!cue) return;

    const len = Math.sqrt(directionX * directionX + directionY * directionY);
    if (len === 0) return;

    const maxSpeed = 28;
    const speed = (power / 100) * maxSpeed;
    cue.vx = (directionX / len) * speed;
    cue.vy = (directionY / len) * speed;
  }

  areAllBallsResting(): boolean {
    return this.ballManager.areAllBallsResting();
  }

  predictTrajectory(startX: number, startY: number, dirX: number, dirY: number, maxLength: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len === 0) return points;

    let x = startX;
    let y = startY;
    let vx = (dirX / len);
    let vy = (dirY / len);
    let remaining = maxLength;
    const r = this.geometry.ballRadius;
    const { left, right, top, bottom } = this.geometry.bounds;

    const step = 2;
    while (remaining > 0) {
      const move = Math.min(step, remaining);
      x += vx * move;
      y += vy * move;
      remaining -= move;

      if (x - r < left || x + r > right) {
        vx = -vx;
        x = x - r < left ? left + r : right - r;
      }
      if (y - r < top || y + r > bottom) {
        vy = -vy;
        y = y - r < top ? top + r : bottom - r;
      }

      if (points.length < 2 ||
        Math.abs(points[points.length - 1].x - x) > 3 ||
        Math.abs(points[points.length - 1].y - y) > 3) {
        points.push({ x, y });
      }

      const balls = this.ballManager.getBalls().filter(b => !b.isCue && !b.isPotted);
      let hitBall = false;
      for (const ball of balls) {
        const bdx = x - ball.x;
        const bdy = y - ball.y;
        const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
        if (bdist < r + ball.radius) {
          points.push({ x, y });
          hitBall = true;
          break;
        }
      }
      if (hitBall) break;
    }

    if (points.length < 2 || points[points.length - 1].x !== x || points[points.length - 1].y !== y) {
      points.push({ x, y });
    }

    return points;
  }
}
