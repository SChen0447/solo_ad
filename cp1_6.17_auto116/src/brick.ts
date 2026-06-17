import { ParticleSystem } from './particle';

const RAINBOW_COLORS: string[] = [
  '#ef5350',
  '#ff9800',
  '#ffee58',
  '#66bb6a',
  '#42a5f5',
  '#ab47bc'
];

const GOLD_COLORS = {
  base: '#ffd700',
  light: '#fff59d',
  dark: '#ff8f00'
};

export interface BrickHitResult {
  destroyed: boolean;
  score: number;
  cx: number;
  cy: number;
}

export class Brick {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public color: string;
  public hp: number;
  public maxHp: number;
  public isGold: boolean;
  public alive: boolean;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    isGold: boolean = false
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.isGold = isGold;
    this.maxHp = isGold ? 2 : 1;
    this.hp = this.maxHp;
    this.alive = true;
  }

  hit(particles: ParticleSystem): BrickHitResult {
    this.hp--;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    let score = 0;

    if (this.hp <= 0) {
      this.alive = false;
      score = this.isGold ? 200 : 100;
      const particleCount = 20 + Math.floor(Math.random() * 11);
      const color = this.isGold ? GOLD_COLORS.base : this.color;
      particles.emitParticles(cx, cy, color, particleCount);
      particles.emitShockwave(cx, cy, color);
      if (this.isGold) {
        particles.emitCoin(cx, cy);
      }
    } else {
      particles.emitParticles(cx, cy, this.color, 5);
    }

    return {
      destroyed: !this.alive,
      score,
      cx,
      cy
    };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    
    if (this.isGold) {
      const gradient = ctx.createLinearGradient(
        this.x, this.y,
        this.x, this.y + this.height
      );
      gradient.addColorStop(0, GOLD_COLORS.light);
      gradient.addColorStop(0.5, GOLD_COLORS.base);
      gradient.addColorStop(1, GOLD_COLORS.dark);
      ctx.fillStyle = gradient;
      ctx.shadowColor = GOLD_COLORS.base;
      ctx.shadowBlur = this.hp < this.maxHp ? 15 : 8;
    } else {
      const gradient = ctx.createLinearGradient(
        this.x, this.y,
        this.x, this.y + this.height
      );
      gradient.addColorStop(0, this.lightenColor(this.color, 30));
      gradient.addColorStop(1, this.darkenColor(this.color, 20));
      ctx.fillStyle = gradient;
    }

    const radius = 4;
    this.roundRect(ctx, this.x, this.y, this.width, this.height, radius);
    ctx.fill();

    if (this.isGold) {
      ctx.fillStyle = '#ff6f00';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText('★', this.x + this.width / 2, this.y + this.height / 2);
    }

    if (this.hp < this.maxHp) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, this.x + 2, this.y + 2, this.width - 4, this.height - 4, radius - 1);
      ctx.stroke();
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}

export class BrickManager {
  public bricks: Brick[] = [];
  private canvasWidth: number;
  private readonly topPadding = 80;
  private readonly sidePadding = 60;
  private readonly brickGap = 1;
  private readonly brickHeight = 30;

  constructor(canvasWidth: number) {
    this.canvasWidth = canvasWidth;
  }

  generateLevel(level: number): void {
    this.bricks = [];
    
    const densityMap: Record<number, { rows: number; cols: number; goldChance: number }> = {
      1: { rows: 5, cols: 8, goldChance: 0.08 },
      2: { rows: 6, cols: 9, goldChance: 0.15 },
      3: { rows: 7, cols: 10, goldChance: 0.25 }
    };

    const config = densityMap[level] || densityMap[3];
    const { rows, cols, goldChance } = config;

    const totalGapWidth = (cols - 1) * this.brickGap;
    const availableWidth = this.canvasWidth - this.sidePadding * 2 - totalGapWidth;
    const brickWidth = availableWidth / cols;

    for (let row = 0; row < rows; row++) {
      const colorIndex = row % RAINBOW_COLORS.length;
      const color = RAINBOW_COLORS[colorIndex];

      for (let col = 0; col < cols; col++) {
        const x = this.sidePadding + col * (brickWidth + this.brickGap);
        const y = this.topPadding + row * (this.brickHeight + this.brickGap);
        const isGold = Math.random() < goldChance;
        this.bricks.push(new Brick(x, y, brickWidth, this.brickHeight, color, isGold));
      }
    }
  }

  allDestroyed(): boolean {
    return this.bricks.every((b) => !b.alive);
  }

  aliveCount(): number {
    return this.bricks.filter((b) => b.alive).length;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const brick of this.bricks) {
      brick.draw(ctx);
    }
  }
}
