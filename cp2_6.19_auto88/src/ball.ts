export interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface InputState {
  tiltX: number;
  tiltY: number;
  keyLeft: boolean;
  keyRight: boolean;
  keyUp: boolean;
  keyDown: boolean;
}

export class Ball {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 0;
  public baseSpeed: number = 280;
  public trail: TrailParticle[] = [];
  public squashTimer: number = 0;
  public squashX: number = 1;
  public squashY: number = 1;
  public rotation: number = 0;
  private input: InputState;
  public screenShake: number = 0;
  private particlePool: TrailParticle[] = [];
  private readonly MAX_PARTICLES: number = 40;
  private spawnCooldown: number = 0;
  private lastCollisionNormal: { x: number; y: number } | null = null;

  constructor() {
    this.input = {
      tiltX: 0,
      tiltY: 0,
      keyLeft: false,
      keyRight: false,
      keyUp: false,
      keyDown: false
    };
    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particlePool.push({ x: 0, y: 0, life: 0, maxLife: 0.3, size: 0 });
    }
  }

  private getParticleFromPool(): TrailParticle | null {
    for (const p of this.particlePool) {
      if (p.life <= 0) return p;
    }
    if (this.trail.length < this.MAX_PARTICLES) {
      const p = { x: 0, y: 0, life: 0, maxLife: 0.3, size: 0 };
      this.particlePool.push(p);
      return p;
    }
    return null;
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    for (const p of this.particlePool) {
      p.life = 0;
    }
  }

  public setRadius(radius: number): void {
    this.radius = radius;
  }

  public setInput(input: Partial<InputState>): void {
    Object.assign(this.input, input);
  }

  public setSpeedMultiplier(mult: number): void {
    this.baseSpeed = 280 * mult;
  }

  public update(dt: number, maze: { cellSize: number }): { collidedWall: boolean } {
    let ax = 0;
    let ay = 0;

    if (this.input.keyLeft) ax -= 1;
    if (this.input.keyRight) ax += 1;
    if (this.input.keyUp) ay -= 1;
    if (this.input.keyDown) ay += 1;

    ax += this.input.tiltX * 2.5;
    ay += this.input.tiltY * 2.5;

    const mag = Math.sqrt(ax * ax + ay * ay);
    if (mag > 1) {
      ax /= mag;
      ay /= mag;
    }

    const accel = this.baseSpeed * 6;
    this.vx += ax * accel * dt;
    this.vy += ay * accel * dt;

    const friction = 0.92;
    this.vx *= Math.pow(friction, dt * 60);
    this.vy *= Math.pow(friction, dt * 60);

    const maxSpeed = this.baseSpeed;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > maxSpeed) {
      this.vx = (this.vx / currentSpeed) * maxSpeed;
      this.vy = (this.vy / currentSpeed) * maxSpeed;
    }

    this.rotation += (this.vx + this.vy) * dt * 0.02;

    if (this.squashTimer > 0) {
      this.squashTimer -= dt;
      const t = this.squashTimer / 0.1;
      if (this.lastCollisionNormal) {
        const nx = this.lastCollisionNormal.x;
        const ny = this.lastCollisionNormal.y;
        const compressAmount = 0.2 * (1 - t);
        this.squashX = 1 + Math.abs(ny) * compressAmount - Math.abs(nx) * compressAmount * 0.5;
        this.squashY = 1 + Math.abs(nx) * compressAmount - Math.abs(ny) * compressAmount * 0.5;
      } else {
        this.squashX = 1 - 0.15 * (1 - t);
        this.squashY = 1 + 0.15 * (1 - t);
      }
      if (this.squashTimer <= 0) {
        this.squashX = 1;
        this.squashY = 1;
        this.lastCollisionNormal = null;
      }
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 2.5);
    }

    this.updateTrail(dt, maze);

    return { collidedWall: false };
  }

  public triggerSquash(normalX: number = 0, normalY: number = -1): void {
    this.squashTimer = 0.1;
    this.screenShake = 0.5;
    this.lastCollisionNormal = { x: normalX, y: normalY };
  }

  public bounce(normalX: number, normalY: number, restitution: number = 0.55): void {
    const dot = this.vx * normalX + this.vy * normalY;
    this.vx -= 2 * dot * normalX * restitution;
    this.vy -= 2 * dot * normalY * restitution;
    this.triggerSquash(normalX, normalY);
  }

  private updateTrail(dt: number, maze: { cellSize: number }): void {
    this.spawnCooldown = Math.max(0, this.spawnCooldown - dt);

    for (const p of this.trail) {
      if (p.life > 0) {
        p.life -= dt;
      }
    }
    this.trail = this.trail.filter(p => p.life > 0);

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maze.cellSize * 1.2 && this.spawnCooldown <= 0 && this.trail.length < this.MAX_PARTICLES) {
      const p = this.getParticleFromPool();
      if (p) {
        p.x = this.x + (Math.random() - 0.5) * this.radius * 0.3;
        p.y = this.y + (Math.random() - 0.5) * this.radius * 0.3;
        p.life = 0.3;
        p.maxLife = 0.3;
        p.size = this.radius * (0.35 + Math.random() * 0.25);
        this.trail.push(p);
        this.spawnCooldown = 0.025;
      }
    }
  }

  private getTrailColor(t: number): { r: number; g: number; b: number } {
    const startHue = 45;
    const endHue = 25;
    const startSat = 100;
    const endSat = 100;
    const startLight = 70;
    const endLight = 55;

    const hue = startHue + (endHue - startHue) * (1 - t);
    const sat = startSat + (endSat - startSat) * (1 - t);
    const light = startLight + (endLight - startLight) * (1 - t);

    const c = (1 - Math.abs(2 * light / 100 - 1)) * sat / 100;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light / 100 - c / 2;

    let r, g, b;
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return {
      r: Math.floor((r + m) * 255),
      g: Math.floor((g + m) * 255),
      b: Math.floor((b + m) * 255)
    };
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const len = this.trail.length;
    for (let i = 0; i < len; i++) {
      const p = this.trail[i];
      const t = p.life / p.maxLife;
      const color = this.getTrailColor(t);
      const size = p.size * (0.4 + 0.6 * t);

      ctx.globalAlpha = t * 0.5;
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.squashX, this.squashY);
    ctx.rotate(this.rotation);

    const r = this.radius;

    ctx.shadowColor = 'rgba(255, 200, 50, 0.7)';
    ctx.shadowBlur = 25;

    const ballGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
    ballGrad.addColorStop(0, '#fffbe0');
    ballGrad.addColorStop(0.15, '#fff2a0');
    ballGrad.addColorStop(0.35, '#ffd530');
    ballGrad.addColorStop(0.65, '#f0a500');
    ballGrad.addColorStop(0.85, '#d08000');
    ballGrad.addColorStop(1, '#804000');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.17, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(r * 0.22, r * 0.28, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.4, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
