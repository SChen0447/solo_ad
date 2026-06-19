import { BallManager, Ball } from './BallManager';
import { TableGeometry, Pocket } from './TableGeometry';

export interface PocketEvent {
  ball: Ball;
  pocket: Pocket;
}

class SpatialHashGrid {
  private cellSize: number;
  private cells: Map<string, Ball[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear(): void {
    this.cells.clear();
  }

  private getKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  insert(ball: Ball): void {
    const cx = Math.floor(ball.x / this.cellSize);
    const cy = Math.floor(ball.y / this.cellSize);
    const key = this.getKey(cx, cy);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(ball);
  }

  query(ball: Ball): Ball[] {
    const cx = Math.floor(ball.x / this.cellSize);
    const cy = Math.floor(ball.y / this.cellSize);
    const candidates: Ball[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getKey(cx + dx, cy + dy);
        const cell = this.cells.get(key);
        if (cell) {
          for (const other of cell) {
            candidates.push(other);
          }
        }
      }
    }

    return candidates;
  }
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
  private spatialGrid: SpatialHashGrid;

  constructor(ballManager: BallManager, geometry: TableGeometry) {
    this.ballManager = ballManager;
    this.geometry = geometry;
    this.spatialGrid = new SpatialHashGrid(geometry.ballRadius * 4);
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
      if (ball.isPocketed) continue;
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
    if (ball.isPocketed) return;

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
    const balls = this.ballManager.getBalls().filter(b => !b.isPocketed);

    this.spatialGrid.clear();
    for (const ball of balls) {
      this.spatialGrid.insert(ball);
    }

    for (const ball of balls) {
      const candidates = this.spatialGrid.query(ball);
      for (const other of candidates) {
        if (other.id > ball.id) {
          this.resolveBallCollision(ball, other);
        }
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

    const nx = dirX / len;
    const ny = dirY / len;
    const r = this.geometry.ballRadius;
    const { left, right, top, bottom } = this.geometry.bounds;
    const pockets = this.geometry.pockets;

    let x = startX;
    let y = startY;
    let traveled = 0;
    const step = 2;

    while (traveled < maxLength) {
      const move = Math.min(step, maxLength - traveled);
      x += nx * move;
      y += ny * move;
      traveled += move;

      const lastPoint = points[points.length - 1];
      const dx = x - lastPoint.x;
      const dy = y - lastPoint.y;
      if (dx * dx + dy * dy > 9) {
        points.push({ x, y });
      }

      if (x - r < left || x + r > right || y - r < top || y + r > bottom) {
        break;
      }

      let hitPocket = false;
      for (const pocket of pockets) {
        const pdx = x - pocket.x;
        const pdy = y - pocket.y;
        if (pdx * pdx + pdy * pdy < pocket.radius * pocket.radius) {
          hitPocket = true;
          break;
        }
      }
      if (hitPocket) break;

      const balls = this.ballManager.getBalls().filter(b => !b.isCue && !b.isPocketed);
      let hitBall = false;
      for (const ball of balls) {
        const bdx = x - ball.x;
        const bdy = y - ball.y;
        if (bdx * bdx + bdy * bdy < 4 * r * r) {
          hitBall = true;
          break;
        }
      }
      if (hitBall) break;
    }

    const endPoint = points[points.length - 1];
    if (endPoint.x !== x || endPoint.y !== y) {
      points.push({ x, y });
    }

    return points;
  }
}
