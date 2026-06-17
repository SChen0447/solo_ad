export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'star' | 'explosion' | 'trail' | 'collect';
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 500;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initStars();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  private initStars(): void {
    for (let i = 0; i < 150; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        life: Infinity,
        maxLife: Infinity,
        size: Math.random() * 2 + 0.5,
        color: `hsl(${210 + Math.random() * 40}, 70%, ${70 + Math.random() * 20}%)`,
        alpha: Math.random() * 0.5 + 0.3,
        type: 'star',
      });
    }
  }

  spawnExplosion(x: number, y: number, color: string, count: number = 15): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        type: 'explosion',
      });
    }
  }

  spawnTrail(x: number, y: number, angle: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;
    this.particles.push({
      x: x + Math.cos(angle) * -18 + (Math.random() - 0.5) * 4,
      y: y + Math.sin(angle) * -18 + (Math.random() - 0.5) * 4,
      vx: Math.cos(angle) * -0.5 + (Math.random() - 0.5) * 0.3,
      vy: Math.sin(angle) * -0.5 + (Math.random() - 0.5) * 0.3,
      life: 0.6,
      maxLife: 0.6,
      size: Math.random() * 3 + 2,
      color: '#64b5f6',
      alpha: 0.8,
      type: 'trail',
    });
  }

  spawnCollect(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: Math.random() * 3 + 1,
        color,
        alpha: 1,
        type: 'collect',
      });
    }
  }

  update(dt: number): void {
    const stars: Particle[] = [];
    const active: Particle[] = [];

    for (const p of this.particles) {
      if (p.type === 'star') {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
        p.alpha = 0.3 + Math.sin(Date.now() * 0.002 + p.x) * 0.3;
        stars.push(p);
      } else {
        p.life -= dt;
        if (p.life > 0) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.type === 'explosion') {
            p.vx *= 0.98;
            p.vy *= 0.98;
          }
          p.alpha = p.life / p.maxLife;
          active.push(p);
        }
      }
    }

    this.particles = [...stars, ...active];
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'star') {
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'trail') {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  get count(): number {
    return this.particles.length;
  }
}
