import { Particle, CANVAS_W, CANVAS_H } from '../../types';

export class VisualEffects {
  particles: Particle[] = [];
  shakeIntensity: number = 0;
  shakeDuration: number = 0;
  shakeTimer: number = 0;
  shakeOffsetX: number = 0;
  shakeOffsetY: number = 0;
  flashAlpha: number = 0;
  lowPerformance: boolean = false;

  renderComboBurst(x: number, y: number, combo: number, color: string) {
    const count = Math.min(8 + combo, 30);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 50 + Math.random() * 100 + combo * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  renderScreenShake(intensity: number, duration: number) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  renderGlow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number) {
    if (this.lowPerformance) return;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  triggerGameOverFlash() {
    this.flashAlpha = 1;
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = this.shakeTimer / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * progress;
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity * CANVAS_W;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity * CANVAS_H;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha -= dt * 0.8;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderFlash(ctx: CanvasRenderingContext2D) {
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }

  reset() {
    this.particles = [];
    this.shakeTimer = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.flashAlpha = 0;
  }
}
