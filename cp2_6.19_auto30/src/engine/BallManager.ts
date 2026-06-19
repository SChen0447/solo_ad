import { TableGeometry } from './TableGeometry';

export interface BallTrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  stripeColor: string;
  number: number;
  isStripe: boolean;
  isCue: boolean;
  isPocketed: boolean;
  trail: BallTrailPoint[];
}

export const BALL_COLORS: Record<number, { color: string; stripe: string; isStripe: boolean }> = {
  0: { color: '#FFFFFF', stripe: '#FFFFFF', isStripe: false },
  1: { color: '#FFD700', stripe: '#FFD700', isStripe: false },
  2: { color: '#1E40AF', stripe: '#1E40AF', isStripe: false },
  3: { color: '#DC2626', stripe: '#DC2626', isStripe: false },
  4: { color: '#6B21A8', stripe: '#6B21A8', isStripe: false },
  5: { color: '#EA580C', stripe: '#EA580C', isStripe: false },
  6: { color: '#166534', stripe: '#166534', isStripe: false },
  7: { color: '#7C2D12', stripe: '#7C2D12', isStripe: false },
  8: { color: '#111111', stripe: '#111111', isStripe: false },
  9: { color: '#FFFFFF', stripe: '#FFD700', isStripe: true },
  10: { color: '#FFFFFF', stripe: '#1E40AF', isStripe: true },
  11: { color: '#FFFFFF', stripe: '#DC2626', isStripe: true },
  12: { color: '#FFFFFF', stripe: '#6B21A8', isStripe: true },
  13: { color: '#FFFFFF', stripe: '#EA580C', isStripe: true },
  14: { color: '#FFFFFF', stripe: '#166534', isStripe: true },
  15: { color: '#FFFFFF', stripe: '#7C2D12', isStripe: true }
};

export class BallManager {
  private balls: Ball[] = [];
  private geometry: TableGeometry;

  constructor(geometry: TableGeometry) {
    this.geometry = geometry;
    this.initializeBalls();
  }

  private initializeBalls(): void {
    this.balls = [];
    const r = this.geometry.ballRadius;

    const cueBall: Ball = {
      id: 0,
      x: this.geometry.bounds.left + (this.geometry.bounds.right - this.geometry.bounds.left) * 0.25,
      y: this.geometry.height / 2,
      vx: 0,
      vy: 0,
      radius: r,
      color: BALL_COLORS[0].color,
      stripeColor: BALL_COLORS[0].stripe,
      number: 0,
      isStripe: false,
      isCue: true,
      isPocketed: false,
      trail: []
    };
    this.balls.push(cueBall);

    const rackX = this.geometry.bounds.right - (this.geometry.bounds.right - this.geometry.bounds.left) * 0.25;
    const rackY = this.geometry.height / 2;
    const spacing = r * 2 + 1;

    const rackOrder = [1, 11, 2, 10, 8, 3, 9, 4, 14, 5, 13, 6, 12, 7, 15];
    let idx = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        if (idx >= rackOrder.length) break;
        const num = rackOrder[idx];
        const c = BALL_COLORS[num];
        const ball: Ball = {
          id: num,
          x: rackX + row * spacing * Math.cos(Math.PI / 6),
          y: rackY + (col - row / 2) * spacing,
          vx: 0,
          vy: 0,
          radius: r,
          color: c.color,
          stripeColor: c.stripe,
          number: num,
          isStripe: c.isStripe,
          isCue: false,
          isPocketed: false,
          trail: []
        };
        this.balls.push(ball);
        idx++;
      }
    }
  }

  getBalls(): Ball[] {
    return this.balls.filter(b => !b.isPocketed);
  }

  getAllBalls(): Ball[] {
    return this.balls;
  }

  getCueBall(): Ball | undefined {
    return this.balls.find(b => b.isCue && !b.isPocketed);
  }

  setCueBallPosition(x: number, y: number): void {
    const cue = this.balls.find(b => b.isCue);
    if (cue) {
      const clamped = this.geometry.clampToBreakArea(x, y);
      cue.x = clamped.x;
      cue.y = clamped.y;
      cue.vx = 0;
      cue.vy = 0;
      cue.isPocketed = false;
      cue.trail = [];
    }
  }

  updateBallPosition(ball: Ball, dt: number): void {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > 5) {
      ball.trail.unshift({ x: ball.x, y: ball.y, alpha: 0.5 });
      if (ball.trail.length > 8) {
        ball.trail.pop();
      }
    }
    ball.trail.forEach(t => (t.alpha *= 0.85));
    ball.trail = ball.trail.filter(t => t.alpha > 0.05);
  }

  areAllBallsResting(speedThreshold: number = 0.1): boolean {
    return this.balls.every(b => b.isPocketed || Math.sqrt(b.vx * b.vx + b.vy * b.vy) < speedThreshold);
  }

  potBall(ball: Ball): void {
    ball.isPocketed = true;
    ball.vx = 0;
    ball.vy = 0;
  }

  resetCueBall(): void {
    const cue = this.balls.find(b => b.isCue);
    if (cue) {
      cue.isPocketed = false;
      cue.x = this.geometry.bounds.left + (this.geometry.bounds.right - this.geometry.bounds.left) * 0.25;
      cue.y = this.geometry.height / 2;
      cue.vx = 0;
      cue.vy = 0;
      cue.trail = [];
    }
  }

  reset(): void {
    this.initializeBalls();
  }

  getRemainingColoredBalls(): Ball[] {
    return this.balls.filter(b => !b.isCue && b.number !== 8 && !b.isPocketed);
  }

  is8BallPotted(): boolean {
    const ball8 = this.balls.find(b => b.number === 8);
    return !!ball8?.isPocketed;
  }

  private getRackPositions(): Map<number, { x: number; y: number }> {
    const map = new Map<number, { x: number; y: number }>();
    const r = this.geometry.ballRadius;
    const rackX = this.geometry.bounds.right - (this.geometry.bounds.right - this.geometry.bounds.left) * 0.25;
    const rackY = this.geometry.height / 2;
    const spacing = r * 2 + 1;

    const rackOrder = [1, 11, 2, 10, 8, 3, 9, 4, 14, 5, 13, 6, 12, 7, 15];
    let idx = 0;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        if (idx >= rackOrder.length) break;
        const num = rackOrder[idx];
        const x = rackX + row * spacing * Math.cos(Math.PI / 6);
        const y = rackY + (col - row / 2) * spacing;
        map.set(num, { x, y });
        idx++;
      }
    }
    return map;
  }

  rerack(): void {
    const rackPositions = this.getRackPositions();

    for (const ball of this.balls) {
      if (ball.isCue) {
        if (!ball.isPocketed) {
          ball.x = this.geometry.bounds.left + (this.geometry.bounds.right - this.geometry.bounds.left) * 0.25;
          ball.y = this.geometry.height / 2;
          ball.vx = 0;
          ball.vy = 0;
          ball.trail = [];
        }
      } else {
        if (!ball.isPocketed) {
          const pos = rackPositions.get(ball.number);
          if (pos) {
            ball.x = pos.x;
            ball.y = pos.y;
            ball.vx = 0;
            ball.vy = 0;
            ball.trail = [];
          }
        }
      }
    }
  }

  isStalemate(): boolean {
    const remainingColored = this.getRemainingColoredBalls();
    if (remainingColored.length < 3) return false;

    const meanX = remainingColored.reduce((sum, b) => sum + b.x, 0) / remainingColored.length;
    const varianceX = remainingColored.reduce((sum, b) => sum + (b.x - meanX) ** 2, 0) / remainingColored.length;
    const stdDevX = Math.sqrt(varianceX);
    if (stdDevX < 80) return true;

    const corners = [
      { x: this.geometry.bounds.left, y: this.geometry.bounds.top },
      { x: this.geometry.bounds.right, y: this.geometry.bounds.top },
      { x: this.geometry.bounds.left, y: this.geometry.bounds.bottom },
      { x: this.geometry.bounds.right, y: this.geometry.bounds.bottom }
    ];
    const remainingBalls = this.balls.filter(b => !b.isPocketed);
    for (const ball of remainingBalls) {
      let minCornerDist = Infinity;
      for (const corner of corners) {
        const dist = Math.sqrt((ball.x - corner.x) ** 2 + (ball.y - corner.y) ** 2);
        if (dist < minCornerDist) minCornerDist = dist;
      }
      if (minCornerDist >= 200) {
        break;
      }
      if (ball === remainingBalls[remainingBalls.length - 1]) {
        return true;
      }
    }
    let allInCorner = true;
    for (const ball of remainingBalls) {
      let minCornerDist = Infinity;
      for (const corner of corners) {
        const dist = Math.sqrt((ball.x - corner.x) ** 2 + (ball.y - corner.y) ** 2);
        if (dist < minCornerDist) minCornerDist = dist;
      }
      if (minCornerDist >= 200) {
        allInCorner = false;
        break;
      }
    }
    if (allInCorner) return true;

    const ball8 = this.balls.find(b => b.number === 8 && !b.isPocketed);
    if (ball8) {
      const dists: number[] = [];
      for (const b of remainingColored) {
        const d = Math.sqrt((b.x - ball8.x) ** 2 + (b.y - ball8.y) ** 2);
        dists.push(d);
      }
      dists.sort((a, b) => a - b);
      const nearest3 = dists.slice(0, Math.min(3, dists.length));
      if (nearest3.length >= 3) {
        const avgDist = nearest3.reduce((s, d) => s + d, 0) / nearest3.length;
        if (avgDist < 50) return true;
      }
    }

    return false;
  }
}
