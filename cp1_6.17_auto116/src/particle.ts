export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: string;
  public size: number;
  public life: number;
  public maxLife: number;
  public gravity: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.size = 3 + Math.random() * 3;
    this.maxLife = 1.5;
    this.life = this.maxLife;
    this.gravity = 0.3;
  }

  update(dt: number): boolean {
    this.vy += this.gravity * dt * 60;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= dt;
    this.size = Math.max(0, this.size * (1 - dt / this.maxLife));
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
    ctx.restore();
  }
}

export class Shockwave {
  public x: number;
  public y: number;
  public radius: number;
  public maxRadius: number;
  public life: number;
  public maxLife: number;
  public color: string;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 50;
    this.maxLife = 0.8;
    this.life = this.maxLife;
    this.color = color;
  }

  update(dt: number): boolean {
    this.life -= dt;
    const progress = 1 - this.life / this.maxLife;
    this.radius = this.maxRadius * progress;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = (this.life / this.maxLife) * 0.8;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.stroke();
    ctx.restore();
  }
}

export class Coin {
  public x: number;
  public y: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public radius: number;
  public gravity: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vy = -3 - Math.random() * 2;
    this.maxLife = 1.2;
    this.life = this.maxLife;
    this.radius = 14;
    this.gravity = 0.2;
  }

  update(dt: number): boolean {
    this.vy += this.gravity * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.min(1, this.life / this.maxLife * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, '#fff9c4');
    gradient.addColorStop(0.5, '#ffd700');
    gradient.addColorStop(1, '#ff8f00');
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffd700';
    ctx.fill();
    
    ctx.fillStyle = '#ff6f00';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('★', this.x, this.y);
    
    ctx.restore();
  }
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private coins: Coin[] = [];
  private readonly maxParticles = 500;

  emitParticles(x: number, y: number, color: string, count: number): void {
    const startCount = this.particles.length;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }
      this.particles.push(new Particle(x, y, color));
    }
    void startCount;
  }

  emitShockwave(x: number, y: number, color: string): void {
    this.shockwaves.push(new Shockwave(x, y, color));
  }

  emitCoin(x: number, y: number): void {
    this.coins.push(new Coin(x, y));
  }

  update(dt: number): void {
    this.particles = this.particles.filter((p) => p.update(dt));
    this.shockwaves = this.shockwaves.filter((s) => s.update(dt));
    this.coins = this.coins.filter((c) => c.update(dt));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const s of this.shockwaves) {
      s.draw(ctx);
    }
    for (const p of this.particles) {
      p.draw(ctx);
    }
    for (const c of this.coins) {
      c.draw(ctx);
    }
  }

  clear(): void {
    this.particles = [];
    this.shockwaves = [];
    this.coins = [];
  }
}
