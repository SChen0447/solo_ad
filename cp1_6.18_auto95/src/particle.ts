export type ParticleType = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan';

export const PARTICLE_TYPES: ParticleType[] = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan'];

export const PARTICLE_COLORS: Record<ParticleType, string> = {
  red: '#ff4d4d',
  blue: '#4d79ff',
  green: '#4dff88',
  yellow: '#ffdd4d',
  purple: '#c84dff',
  cyan: '#4dffff'
};

export const PARTICLE_NAMES: Record<ParticleType, string> = {
  red: '红色',
  blue: '蓝色',
  green: '绿色',
  yellow: '黄色',
  purple: '紫色',
  cyan: '跟随者'
};

export type Rule = 'attract' | 'repel' | 'follow' | 'ignore';

export const RULE_LABELS: Record<Rule, string> = {
  attract: '吸引',
  repel: '排斥',
  follow: '跟随',
  ignore: '无视'
};

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Particle {
  public id: number;
  public type: ParticleType;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public bornAt: number;
  public dying: boolean;
  public dieAt?: number;
  public dieDx?: number;
  public dieDy?: number;
  public trail: TrailPoint[];

  private static _idCounter = 0;
  private static readonly BORN_DURATION = 350;
  private static readonly DIE_DURATION = 500;
  private static readonly MAX_TRAIL = 6;
  private static readonly BASE_RADIUS = 3.5;
  private static readonly MAX_SPEED = 6.5;
  private static readonly FRICTION = 0.985;

  constructor(type: ParticleType, x: number, y: number, now: number) {
    this.id = ++Particle._idCounter;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.bornAt = now;
    this.dying = false;
    this.trail = [];
  }

  public update(
    dt: number,
    forceX: number,
    forceY: number,
    bounds: { w: number; h: number },
    now: number
  ): void {
    if (this.dying && this.dieAt !== undefined) {
      const t = (now - this.dieAt) / Particle.DIE_DURATION;
      if (t >= 1) return;
      const spread = 1 + t * 3.2;
      this.x += (this.dieDx ?? 0) * spread;
      this.y += (this.dieDy ?? 0) * spread;
      return;
    }

    const dtFactor = dt / (1000 / 60);

    this.vx += forceX * dtFactor;
    this.vy += forceY * dtFactor;

    this.vx *= Particle.FRICTION;
    this.vy *= Particle.FRICTION;

    const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (sp > Particle.MAX_SPEED) {
      const k = Particle.MAX_SPEED / sp;
      this.vx *= k;
      this.vy *= k;
    }

    this.x += this.vx * dtFactor;
    this.y += this.vy * dtFactor;

    if (this.x < 0) { this.x = 0; this.vx = -this.vx * 0.5; }
    if (this.x > bounds.w) { this.x = bounds.w; this.vx = -this.vx * 0.5; }
    if (this.y < 0) { this.y = 0; this.vy = -this.vy * 0.5; }
    if (this.y > bounds.h) { this.y = bounds.h; this.vy = -this.vy * 0.5; }

    if (this.trail.length === 0 ||
        Math.hypot(this.trail[0].x - this.x, this.trail[0].y - this.y) > 1.5) {
      this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
      if (this.trail.length > Particle.MAX_TRAIL) this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = Math.max(0, 1 - i / Particle.MAX_TRAIL);
    }
  }

  public startDying(now: number): void {
    if (this.dying) return;
    this.dying = true;
    this.dieAt = now;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2.5;
    this.dieDx = Math.cos(angle) * speed;
    this.dieDy = Math.sin(angle) * speed;
  }

  public isDead(now: number): boolean {
    return this.dying && this.dieAt !== undefined && (now - this.dieAt) >= Particle.DIE_DURATION;
  }

  public getSpeed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    perfMode: boolean,
    now: number,
    showTrail: boolean
  ): void {
    const color = PARTICLE_COLORS[this.type];

    let scale = 1;
    let alpha = 1;

    if (!this.dying) {
      const bornT = Math.min(1, (now - this.bornAt) / Particle.BORN_DURATION);
      const elastic = 1 + Math.sin(bornT * Math.PI) * 0.7 * (1 - bornT);
      scale = 0.2 + bornT * 0.9 + (elastic - 1);
      alpha = Math.min(1, bornT * 1.5);
    } else if (this.dieAt !== undefined) {
      const t = (now - this.dieAt) / Particle.DIE_DURATION;
      alpha = Math.max(0, 1 - t);
      scale = 1 + t * 1.8;
    }

    const radius = Particle.BASE_RADIUS * scale;

    if (!perfMode) {
      if (showTrail && !this.dying && this.trail.length > 1) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = this.trail.length - 1; i >= 1; i--) {
          const pt = this.trail[i];
          const a = pt.alpha * 0.35 * alpha;
          if (a <= 0.02) continue;
          ctx.fillStyle = this._hexToRgba(color, a);
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius * (1 - i / Particle.MAX_TRAIL) * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = this.dying ? 6 * alpha : 14 * alpha + 2;
      ctx.fillStyle = this._hexToRgba(color, alpha);
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = this._hexToRgba('#ffffff', alpha * 0.55);
      ctx.beginPath();
      ctx.arc(this.x - radius * 0.35, this.y - radius * 0.35, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const r = Math.max(1, Math.floor(radius));
      ctx.fillStyle = this._hexToRgba(color, alpha);
      if (r > 2) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), r, r);
      }
    }
  }

  private _hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
