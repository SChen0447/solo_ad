export enum PlayerForm {
  LIGHT = 'light',
  DARK = 'dark'
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  targetX: number;
  targetY: number;
  phase: 'scatter' | 'gather';
}

export interface PlayerState {
  x: number;
  y: number;
  form: PlayerForm;
  radius: number;
}

type FormChangeCallback = (form: PlayerForm) => void;

export class Player {
  private x: number;
  private y: number;
  private radius: number = 15;
  private speed: number = 200;
  private form: PlayerForm = PlayerForm.LIGHT;
  private moveX: number = 0;
  private moveY: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private transitioning: boolean = false;
  private transitionTimer: number = 0;
  private transitionDuration: number = 0.3;
  private particles: Particle[] = [];
  private maxParticles: number = 30;
  private animTime: number = 0;
  private onFormChange: FormChangeCallback;

  constructor(x: number, y: number, onFormChange: FormChangeCallback) {
    this.x = x;
    this.y = y;
    this.onFormChange = onFormChange;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public getRadius(): number {
    if (this.transitioning) {
      const t = this.transitionTimer / this.transitionDuration;
      const scale = Math.sin(t * Math.PI) * 0.3 + 0.7;
      return this.radius * scale;
    }
    return this.radius;
  }

  public getVelocity(): { x: number; y: number } {
    return { x: this.velocityX, y: this.velocityY };
  }

  public getForm(): PlayerForm {
    return this.form;
  }

  public isTransitioning(): boolean {
    return this.transitioning;
  }

  public setMoveDirection(mx: number, my: number): void {
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      this.moveX = mx / len;
      this.moveY = my / len;
    } else {
      this.moveX = 0;
      this.moveY = 0;
    }
  }

  public toggleForm(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.transitionTimer = 0;
    this.spawnTransitionParticles();
  }

  private spawnTransitionParticles(): void {
    const count = 20;
    
    for (let i = this.particles.length; i < this.maxParticles && (i - this.particles.length) < count; i++) {
      const angle = (Math.PI * 2 * (i - this.particles.length)) / count + Math.random() * 0.3;
      const dist = 20 + Math.random() * 30;
      const tx = this.x + Math.cos(angle) * dist;
      const ty = this.y + Math.sin(angle) * dist;
      
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * 150,
        vy: Math.sin(angle) * 150,
        life: this.transitionDuration,
        maxLife: this.transitionDuration,
        size: 2 + Math.random() * 3,
        targetX: tx,
        targetY: ty,
        phase: 'scatter'
      });
    }
  }

  public update(dt: number): void {
    this.animTime += dt;

    this.velocityX = this.moveX * this.speed;
    this.velocityY = this.moveY * this.speed;

    if (this.transitioning) {
      this.transitionTimer += dt;
      const halfDur = this.transitionDuration / 2;

      if (this.transitionTimer >= halfDur && this.transitionTimer - dt < halfDur) {
        this.form = this.form === PlayerForm.LIGHT ? PlayerForm.DARK : PlayerForm.LIGHT;
        this.onFormChange(this.form);
        for (const p of this.particles) {
          p.phase = 'gather';
          p.vx = 0;
          p.vy = 0;
        }
      }

      if (this.transitionTimer >= this.transitionDuration) {
        this.transitioning = false;
        this.transitionTimer = 0;
        this.particles = [];
      }
    }

    this.updateParticles(dt);
  }

  private updateParticles(dt: number): void {
    const progress = this.transitioning ? this.transitionTimer / this.transitionDuration : 0;
    const halfPoint = 0.5;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (progress < halfPoint) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      } else {
        const gatherT = (progress - halfPoint) / (1 - halfPoint);
        const ease = gatherT * gatherT * (3 - 2 * gatherT);
        p.x = p.targetX + (this.x - p.targetX) * ease;
        p.y = p.targetY + (this.y - p.targetY) * ease;
      }

      p.life -= dt;
      if (p.life <= 0 && !this.transitioning) {
        this.particles.splice(i, 1);
      }
    }
  }

  public reset(): void {
    this.moveX = 0;
    this.moveY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.transitioning = false;
    this.transitionTimer = 0;
    this.particles = [];
    this.form = PlayerForm.LIGHT;
    this.onFormChange(this.form);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderParticles(ctx);
    this.renderPlayer(ctx);
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    const displayRadius = this.getRadius();

    if (this.form === PlayerForm.LIGHT) {
      const pulse = 0.85 + Math.sin(this.animTime * Math.PI * 4) * 0.15;
      
      for (let i = 3; i >= 1; i--) {
        const glowRadius = displayRadius + 20 * pulse * (i / 3);
        const alpha = 0.12 * pulse * (1 - i / 4);
        const gradient = ctx.createRadialGradient(this.x, this.y, displayRadius, this.x, this.y, glowRadius);
        gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha * 2})`);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      const mainGradient = ctx.createRadialGradient(
        this.x - displayRadius * 0.3, this.y - displayRadius * 0.3, 0,
        this.x, this.y, displayRadius
      );
      mainGradient.addColorStop(0, '#FFF8B0');
      mainGradient.addColorStop(0.5, '#FFD700');
      mainGradient.addColorStop(1, '#C9A800');
      ctx.fillStyle = mainGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(this.x - displayRadius * 0.35, this.y - displayRadius * 0.35, displayRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const flicker = 0.9 + Math.sin(this.animTime * 8) * 0.05 + Math.sin(this.animTime * 13) * 0.05;

      for (let i = 3; i >= 1; i--) {
        const glowRadius = displayRadius + 12 * (i / 3);
        const alpha = 0.08 * flicker * (1 - i / 4);
        const gradient = ctx.createRadialGradient(this.x, this.y, displayRadius, this.x, this.y, glowRadius);
        gradient.addColorStop(0, `rgba(150, 50, 200, ${alpha * 2})`);
        gradient.addColorStop(1, 'rgba(74, 0, 128, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      const alpha = 0.7 * flicker;
      const mainGradient = ctx.createRadialGradient(
        this.x - displayRadius * 0.3, this.y - displayRadius * 0.3, 0,
        this.x, this.y, displayRadius
      );
      mainGradient.addColorStop(0, `rgba(150, 70, 200, ${alpha})`);
      mainGradient.addColorStop(0.5, `rgba(74, 0, 128, ${alpha})`);
      mainGradient.addColorStop(1, `rgba(40, 0, 70, ${alpha})`);
      ctx.fillStyle = mainGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(180, 100, 220, ${0.4 * flicker})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife * 2);
      const color = this.getParticleColor(p, alpha);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (this.transitioning ? Math.sin((p.life / p.maxLife) * Math.PI) : 1), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private getParticleColor(_p: Particle, alpha: number): string {
    if (!this.transitioning) {
      return this.form === PlayerForm.LIGHT
        ? `rgba(255, 215, 0, ${alpha})`
        : `rgba(150, 50, 200, ${alpha})`;
    }

    const progress = this.transitionTimer / this.transitionDuration;
    const fromLight = this.form === PlayerForm.DARK;

    if (progress < 0.5) {
      const t = progress / 0.5;
      if (fromLight) {
        return this.lerpColor('255,215,0', '150,50,200', t, alpha);
      } else {
        return this.lerpColor('150,50,200', '255,215,0', t, alpha);
      }
    } else {
      const t = (progress - 0.5) / 0.5;
      if (fromLight) {
        return this.lerpColor('150,50,200', '74,0,128', t, alpha);
      } else {
        return this.lerpColor('255,215,0', '255,248,176', t, alpha);
      }
    }
  }

  private lerpColor(c1: string, c2: string, t: number, alpha: number): string {
    const a = c1.split(',').map(Number);
    const b = c2.split(',').map(Number);
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgba(${r},${g},${bl},${alpha})`;
  }
}
