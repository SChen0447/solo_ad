export enum PlayerForm {
  Light = 'light',
  Dark = 'dark'
}

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
}

export interface PlayerState {
  x: number;
  y: number;
  form: PlayerForm;
  isSwitching: boolean;
  switchTimer: number;
  shakeX: number;
  shakeY: number;
}

const PLAYER_SPEED = 200;
const PLAYER_RADIUS = 14;
const GLOW_RADIUS = 20;
const GLOW_PERIOD = 0.5;
const SWITCH_DURATION = 0.3;
const MAX_PARTICLES = 30;

export class Player {
  x: number;
  y: number;
  form: PlayerForm = PlayerForm.Light;
  isSwitching: boolean = false;
  switchTimer: number = 0;
  switchPhase: 'dissipate' | 'gather' = 'dissipate';
  particles: Particle[] = [];
  shakeX: number = 0;
  shakeY: number = 0;
  shakeTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  switchForm(): void {
    if (this.isSwitching) return;
    this.isSwitching = true;
    this.switchTimer = 0;
    this.switchPhase = 'dissipate';
    this.spawnSwitchParticles();
  }

  private spawnSwitchParticles(): void {
    const count = 12;
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const speed = 60 + Math.random() * 80;
      const color = this.form === PlayerForm.Light ? '#FFD700' : '#4A0080';
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: SWITCH_DURATION,
        maxLife: SWITCH_DURATION,
        size: 3 + Math.random() * 3,
        color,
        alpha: 1
      });
    }
  }

  update(dt: number, keys: Set<string>, walls: Array<{x: number; y: number; w: number; h: number}>): void {
    if (this.isSwitching) {
      this.switchTimer += dt;
      if (this.switchPhase === 'dissipate' && this.switchTimer >= SWITCH_DURATION / 2) {
        this.switchPhase = 'gather';
        this.form = this.form === PlayerForm.Light ? PlayerForm.Dark : PlayerForm.Light;
        this.spawnSwitchParticles();
      }
      if (this.switchTimer >= SWITCH_DURATION) {
        this.isSwitching = false;
        this.switchTimer = 0;
      }
    }

    let dx = 0;
    let dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    const speed = this.isSwitching ? PLAYER_SPEED * 0.3 : PLAYER_SPEED;
    const newX = this.x + dx * speed * dt;
    const newY = this.y + dy * speed * dt;

    let collided = false;

    const testX = newX;
    const testY = this.y;
    for (const w of walls) {
      if (this.circleRectCollision(testX, testY, PLAYER_RADIUS, w)) {
        collided = true;
        break;
      }
    }
    this.x = testX;
    if (collided) {
      this.x = newX - dx * speed * dt;
      this.triggerShake();
    }

    collided = false;
    const testY2 = newY;
    for (const w of walls) {
      if (this.circleRectCollision(this.x, testY2, PLAYER_RADIUS, w)) {
        collided = true;
        break;
      }
    }
    this.y = testY2;
    if (collided) {
      this.y = newY - dy * speed * dt;
      this.triggerShake();
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      this.shakeX = (Math.random() - 0.5) * 3;
      this.shakeY = (Math.random() - 0.5) * 3;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.size *= 0.98;
      return p.life > 0;
    });
  }

  private triggerShake(): void {
    if (this.shakeTimer <= 0) {
      this.shakeTimer = 0.1;
    }
  }

  private circleRectCollision(cx: number, cy: number, r: number, rect: {x: number; y: number; w: number; h: number}): boolean {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const distX = cx - closestX;
    const distY = cy - closestY;
    return (distX * distX + distY * distY) < (r * r);
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const px = this.x + this.shakeX;
    const py = this.y + this.shakeY;

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.isSwitching && this.switchPhase === 'dissipate') {
      const progress = this.switchTimer / (SWITCH_DURATION / 2);
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      this.renderForm(ctx, px, py, time, this.form === PlayerForm.Light ? PlayerForm.Light : PlayerForm.Dark);
      ctx.restore();
      return;
    }

    if (this.isSwitching && this.switchPhase === 'gather') {
      const progress = (this.switchTimer - SWITCH_DURATION / 2) / (SWITCH_DURATION / 2);
      ctx.save();
      ctx.globalAlpha = progress;
      this.renderForm(ctx, px, py, time, this.form);
      ctx.restore();
      return;
    }

    this.renderForm(ctx, px, py, time, this.form);
  }

  private renderForm(ctx: CanvasRenderingContext2D, px: number, py: number, time: number, form: PlayerForm): void {
    if (form === PlayerForm.Light) {
      const pulse = 0.7 + 0.3 * Math.sin(time * Math.PI * 2 / GLOW_PERIOD);
      const gradient = ctx.createRadialGradient(px, py, PLAYER_RADIUS * 0.5, px, py, GLOW_RADIUS);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${pulse * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, GLOW_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      const innerGrad = ctx.createRadialGradient(px - 3, py - 3, 0, px, py, PLAYER_RADIUS);
      innerGrad.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
      innerGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const flicker = 0.5 + 0.2 * Math.sin(time * 15) + 0.1 * Math.sin(time * 23);
      ctx.save();
      ctx.globalAlpha = 0.7 + flicker * 0.15;
      ctx.fillStyle = '#4A0080';
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const auraGrad = ctx.createRadialGradient(px, py, PLAYER_RADIUS * 0.8, px, py, PLAYER_RADIUS + 8);
      auraGrad.addColorStop(0, `rgba(74, 0, 128, ${flicker * 0.3})`);
      auraGrad.addColorStop(1, 'rgba(74, 0, 128, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(px, py, PLAYER_RADIUS + 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  getState(): PlayerState {
    return {
      x: this.x,
      y: this.y,
      form: this.form,
      isSwitching: this.isSwitching,
      switchTimer: this.switchTimer,
      shakeX: this.shakeX,
      shakeY: this.shakeY
    };
  }
}
