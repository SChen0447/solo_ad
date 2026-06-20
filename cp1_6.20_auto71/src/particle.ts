export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  active: boolean;
  type: 'star' | 'flame' | 'collect';
}

export class ParticleSystem {
  private pool: Particle[];
  private maxParticles: number;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
    this.pool = [];
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        alpha: 1,
        life: 0,
        maxLife: 1,
        color: '#ffffff',
        active: false,
        type: 'star'
      });
    }
  }

  private getInactiveParticle(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    if (this.pool.length < this.maxParticles * 2) {
      const newParticle: Particle = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        alpha: 1,
        life: 0,
        maxLife: 1,
        color: '#ffffff',
        active: false,
        type: 'star'
      };
      this.pool.push(newParticle);
      return newParticle;
    }
    return null;
  }

  emitStar(x: number, y: number, speed: number = 300): void {
    const p = this.getInactiveParticle();
    if (!p) return;

    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = speed;
    p.size = Math.random() * 2 + 1;
    p.alpha = Math.random() * 0.5 + 0.3;
    p.life = 3;
    p.maxLife = 3;
    p.color = '#ffffff';
    p.active = true;
    p.type = 'star';
  }

  emitFlame(x: number, y: number): void {
    const p = this.getInactiveParticle();
    if (!p) return;

    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const speed = 150 + Math.random() * 100;

    p.x = x + (Math.random() - 0.5) * 8;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.size = Math.random() * 2 + 2;
    p.alpha = 1;
    p.life = 0.2;
    p.maxLife = 0.2;
    p.color = Math.random() > 0.5 ? '#4fc3f7' : '#29b6f6';
    p.active = true;
    p.type = 'flame';
  }

  emitCollectEffect(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const p = this.getInactiveParticle();
      if (!p) continue;

      const angle = (i / 12) * Math.PI * 2;
      const speed = 80 + Math.random() * 40;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = Math.random() * 3 + 2;
      p.alpha = 1;
      p.life = 0.3;
      p.maxLife = 0.3;
      p.color = '#2ed573';
      p.active = true;
      p.type = 'collect';
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.type === 'flame') {
        p.size *= 0.98;
      }

      if (p.life <= 0) {
        p.active = false;
      } else {
        p.alpha = p.life / p.maxLife;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'collect') {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getActiveParticles(): Particle[] {
    return this.pool.filter(p => p.active);
  }

  clear(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
  }
}
