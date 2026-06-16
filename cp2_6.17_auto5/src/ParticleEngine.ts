import type { EmotionResult } from './EmotionMapper';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  waveOffset: number;
  waveAmp: number;
  waveSpeed: number;
  baseY: number;
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  trigger(emotion: EmotionResult, originX: number, originY: number): void {
    const particleCount = this.getParticleCount(emotion);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.8;
      const maxLife = 2000 + Math.random() * 1000;

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        color: emotion.color,
        alpha: 0.9,
        life: maxLife,
        maxLife,
        waveOffset: Math.random() * Math.PI * 2,
        waveAmp: 4 + Math.random() * 8,
        waveSpeed: 0.002 + Math.random() * 0.004,
        baseY: originY
      });
    }

    if (this.animationId === null) {
      this.lastTime = performance.now();
      this.loop();
    }
  }

  private getParticleCount(emotion: EmotionResult): number {
    const base = 30;
    const energyBonus = Math.floor((emotion.energy / 100) * 30);
    const stressBonus = Math.floor((emotion.stress / 100) * 20);
    return Math.min(80, base + energyBonus + stressBonus);
  }

  private loop = (): void => {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.update(delta, now);
    this.render();

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.loop);
    } else {
      this.animationId = null;
      this.clear();
    }
  };

  private update(delta: number, now: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.life -= delta;
      if (p.life <= 0) {
        toRemove.push(i);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      const wave = Math.sin(now * p.waveSpeed + p.waveOffset) * p.waveAmp * 0.02;
      p.x += wave;
      p.y += wave * 0.5;

      p.vx *= 0.99;
      p.vy *= 0.99;

      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio * 0.9;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 80) {
          const alpha = (1 - dist / 80) * 0.6 * Math.min(p1.alpha, p2.alpha);
          this.ctx.strokeStyle = this.hexToRgba(p1.color, alpha);
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    for (const p of this.particles) {
      this.ctx.fillStyle = this.hexToRgba(p.color, p.alpha);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  reset(): void {
    this.particles = [];
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  destroy(): void {
    this.reset();
  }
}
