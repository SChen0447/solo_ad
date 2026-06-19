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
  isPotted: boolean;
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
      isPotted: false,
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
          isPotted: false,
          trail: []
        };
        this.balls.push(ball);
        idx++;
      }
    }
  }

  getBalls(): Ball[] {
    return this.balls.filter(b => !b.isPotted);
  }

  getAllBalls(): Ball[] {
    return this.balls;
  }

  getCueBall(): Ball | undefined {
    return this.balls.find(b => b.isCue && !b.isPotted);
  }

  setCueBallPosition(x: number, y: number): void {
    const cue = this.balls.find(b => b.isCue);
    if (cue) {
      const clamped = this.geometry.clampToBreakArea(x, y);
      cue.x = clamped.x;
      cue.y = clamped.y;
      cue.vx = 0;
      cue.vy = 0;
      cue.isPotted = false;
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
    return this.balls.every(b => b.isPotted || Math.sqrt(b.vx * b.vx + b.vy * b.vy) < speedThreshold);
  }

  potBall(ball: Ball): void {
    ball.isPotted = true;
    ball.vx = 0;
    ball.vy = 0;
  }

  resetCueBall(): void {
    const cue = this.balls.find(b => b.isCue);
    if (cue) {
      cue.isPotted = false;
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
    return this.balls.filter(b => !b.isCue && b.number !== 8 && !b.isPotted);
  }

  is8BallPotted(): boolean {
    const ball8 = this.balls.find(b => b.number === 8);
    return !!ball8?.isPotted;
  }
}
