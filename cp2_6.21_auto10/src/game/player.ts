export enum PlayerForm {
  LIGHT = 'light',
  DARK = 'dark'
}

interface Particle {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  phase: 'scatter' | 'gather';
  scatterEndX: number;
  scatterEndY: number;
  angle: number;
  speed: number;
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
  private scatterParticlesSpawned: boolean = false;
  private gatherParticlesSpawned: boolean = false;

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
    this.scatterParticlesSpawned = false;
    this.gatherParticlesSpawned = false;
    this.particles = [];
  }

  private spawnScatterParticles(): void {
    if (this.scatterParticlesSpawned) return;
    this.scatterParticlesSpawned = true;

    const count = Math.min(20, this.maxParticles);
    const available = this.maxParticles - this.particles.length;
    const actualCount = Math.min(count, available);

    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + Math.random() * 0.2;
      const dist = 45 + Math.random() * 25;
      const endX = this.x + Math.cos(angle) * dist;
      const endY = this.y + Math.sin(angle) * dist;
      const speed = 180 + Math.random() * 120;

      this.particles.push({
        startX: this.x,
        startY: this.y,
        endX: endX,
        endY: endY,
        scatterEndX: endX,
        scatterEndY: endY,
        x: this.x,
        y: this.y,
        size: 2 + Math.random() * 3,
        life: this.transitionDuration / 2,
        maxLife: this.transitionDuration / 2,
        phase: 'scatter',
        angle: angle,
        speed: speed
      });
    }
  }

  private spawnGatherParticles(): void {
    if (this.gatherParticlesSpawned) return;
    this.gatherParticlesSpawned = true;

    const scatterCount = this.particles.length;
    const count = Math.min(20, this.maxParticles);
    const available = this.maxParticles - scatterCount;
    const actualCount = Math.min(count, available);

    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + Math.random() * 0.2 + 0.1;
      const dist = 50 + Math.random() * 30;
      const startX = this.x + Math.cos(angle) * dist;
      const startY = this.y + Math.sin(angle) * dist;

      this.particles.push({
        startX: startX,
        startY: startY,
        endX: this.x,
        endY: this.y,
        scatterEndX: 0,
        scatterEndY: 0,
        x: startX,
        y: startY,
        size: 2 + Math.random() * 3,
        life: this.transitionDuration / 2,
        maxLife: this.transitionDuration / 2,
        phase: 'gather',
        angle: angle,
        speed: 0
      });
    }
  }

  public update(dt: number): void {
    this.animTime += dt;

    this.velocityX = this.moveX * this.speed;
    this.velocityY = this.moveY * this.speed;

    if (this.transitioning) {
      const prevTimer = this.transitionTimer;
      this.transitionTimer += dt;
      const halfDur = this.transitionDuration / 2;

      if (prevTimer < halfDur && this.transitionTimer >= 0) {
        this.spawnScatterParticles();
      }

      if (prevTimer < halfDur && this.transitionTimer >= halfDur) {
        this.form = this.form === PlayerForm.LIGHT ? PlayerForm.DARK : PlayerForm.LIGHT;
        this.onFormChange(this.form);
        this.particles = this.particles.filter(p => p.phase !== 'scatter');
        this.spawnGatherParticles();
      }

      this.updateParticles(dt);

      if (this.transitionTimer >= this.transitionDuration) {
        this.transitioning = false;
        this.transitionTimer = 0;
        this.particles = [];
      }
    }
  }

  private updateParticles(dt: number): void {
    const halfDur = this.transitionDuration / 2;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.phase === 'scatter') {
        const scatterProgress = 1 - (this.transitionTimer) / halfDur;
        const t = Math.max(0, Math.min(1, scatterProgress));
        const easeT = 1 - Math.pow(1 - t, 3);
        p.x = p.startX + (p.endX - p.startX) * easeT;
        p.y = p.startY + (p.endY - p.startY) * easeT;
      } else {
        const gatherTimer = this.transitionTimer - halfDur;
        const t = Math.max(0, Math.min(1, gatherTimer / halfDur));
        const easeT = t * t * (3 - 2 * t);
        p.x = p.startX + (this.x - p.startX) * easeT;
        p.y = p.startY + (this.y - p.startY) * easeT;
      }

      p.life -= dt;
      if (p.life <= 0) {
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
    this.scatterParticlesSpawned = false;
    this.gatherParticlesSpawned = false;
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
    const halfDur = this.transitionDuration / 2;

    for (const p of this.particles) {
      let alpha: number;
      let sizeScale: number;

      if (p.phase === 'scatter') {
        const scatterProgress = 1 - (this.transitionTimer) / halfDur;
        alpha = Math.max(0, Math.min(1, scatterProgress * 1.5));
        sizeScale = 0.6 + 0.4 * scatterProgress;
      } else {
        const gatherTimer = this.transitionTimer - halfDur;
        const t = Math.max(0, Math.min(1, gatherTimer / halfDur));
        alpha = Math.max(0, Math.min(1, t * 1.5));
        sizeScale = 0.4 + 0.6 * t;
      }

      const color = this.getParticleColor(p, alpha);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * sizeScale), 0, Math.PI * 2);
      ctx.fill();

      if (alpha > 0.3) {
        ctx.fillStyle = color.replace(/[\d.]+\)$/, `${alpha * 0.25})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size * sizeScale * 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private getParticleColor(_p: Particle, alpha: number): string {
    const halfDur = this.transitionDuration / 2;
    const fromLight = this.form === PlayerForm.DARK;

    if (_p.phase === 'scatter') {
      const t = 1 - (this.transitionTimer) / halfDur;
      if (fromLight) {
        return this.lerpColor('255,215,0', '180,80,220', 1 - t, alpha);
      } else {
        return this.lerpColor('150,50,200', '255,220,100', 1 - t, alpha);
      }
    } else {
      const gatherTimer = this.transitionTimer - halfDur;
      const t = Math.max(0, Math.min(1, gatherTimer / halfDur));
      if (fromLight) {
        return this.lerpColor('180,80,220', '120,40,180', t, alpha);
      } else {
        return this.lerpColor('255,220,100', '255,240,180', t, alpha);
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
