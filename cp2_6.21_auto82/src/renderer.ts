import { Particle, Spark, ParticleSystem } from './particleSystem';
import { FieldManager } from './fieldManager';
import { ObstacleConfig } from './levelLoader';

export type GameState = 'playing' | 'levelComplete' | 'gameOver' | 'gameWin';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
}

interface TargetFlash {
  index: number;
  elapsed: number;
  count: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stars: Star[] = [];
  private time = 0;
  private targetFlashes: TargetFlash[] = [];
  private completedTargets: Set<number> = new Set();

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random(),
        baseAlpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  draw(
    dt: number,
    particleSystem: ParticleSystem,
    fieldManager: FieldManager,
    obstacles: ObstacleConfig[],
    targets: { x: number; y: number }[],
    levelIndex: number,
    fps: number,
    timeLeft: number,
    gameState: GameState,
    completeElapsed: number,
    performanceMode: boolean,
    dragStart: { x: number; y: number } | null,
  ): void {
    this.time += dt;
    const ctx = this.ctx;

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawStars(ctx);

    if (gameState === 'playing' || gameState === 'levelComplete') {
      this.drawFields(ctx, fieldManager);
      this.drawObstacles(ctx, obstacles);
      this.drawTargets(ctx, targets);

      if (!performanceMode) {
        this.drawTrails(ctx, particleSystem);
      }

      this.drawParticles(ctx, particleSystem);
      this.drawSparks(ctx, particleSystem.sparks);
      this.drawPulseEffects(ctx, particleSystem);

      if (dragStart && gameState === 'playing') {
        this.drawDragLine(ctx, particleSystem, dragStart);
      }
    }

    if (gameState === 'levelComplete') {
      this.drawLevelComplete(ctx, completeElapsed, particleSystem);
    } else if (gameState === 'gameOver') {
      this.drawGameOver(ctx);
    } else if (gameState === 'gameWin') {
      this.drawGameWin(ctx);
    }

    this.drawUI(ctx, levelIndex, particleSystem, fps, timeLeft, gameState);
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(this.time * (2 * Math.PI / 3) + star.phase);
      const alpha = star.baseAlpha * twinkle;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFields(ctx: CanvasRenderingContext2D, fieldManager: FieldManager): void {
    const fields = fieldManager.getFields();
    for (const field of fields) {
      const gradient = ctx.createRadialGradient(
        field.x, field.y, 0,
        field.x, field.y, field.radius,
      );
      if (field.charge > 0) {
        gradient.addColorStop(0, 'rgba(255, 71, 87, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 71, 87, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(46, 213, 115, 0.3)');
        gradient.addColorStop(1, 'rgba(46, 213, 115, 0)');
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawObstacles(ctx: CanvasRenderingContext2D, obstacles: ObstacleConfig[]): void {
    for (const obs of obstacles) {
      const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y + obs.height);
      gradient.addColorStop(0, '#3D3D5C');
      gradient.addColorStop(1, '#2A2A4A');
      ctx.fillStyle = gradient;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      ctx.strokeStyle = '#00D2FF';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
  }

  private drawTargets(ctx: CanvasRenderingContext2D, targets: { x: number; y: number }[]): void {
    for (let i = 0; i < targets.length; i++) {
      if (this.completedTargets.has(i)) continue;

      const t = targets[i];
      const flash = this.targetFlashes.find(f => f.index === i);

      let fillColor = '#FFD700';
      let strokeColor = '#FFD700';

      if (flash) {
        if (flash.count >= 3) {
          this.completedTargets.add(i);
          continue;
        }
        const flashPhase = Math.floor(flash.elapsed / 0.15) % 2;
        fillColor = flashPhase === 0 ? '#00FF88' : '#FFD700';
        strokeColor = fillColor;
      }

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D, particleSystem: ParticleSystem): void {
    for (const p of particleSystem.particles) {
      if (p.reached) continue;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed < 5) continue;

      const trailCount = 5;
      for (let i = 1; i <= trailCount; i++) {
        const t = i / trailCount;
        const tx = p.x - p.vx * t * 0.05;
        const ty = p.y - p.vy * t * 0.05;
        const alpha = (1 - t) * 0.3;
        const r = p.radius * (1 - t * 0.5);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.charge > 0 ? '#FF4757' : '#2ED573';
        ctx.beginPath();
        ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particleSystem: ParticleSystem): void {
    for (const p of particleSystem.particles) {
      if (p.reached) {
        ctx.globalAlpha = 0.4;
      }

      const gradient = ctx.createRadialGradient(
        p.x - 2, p.y - 2, 0,
        p.x, p.y, p.radius,
      );

      if (p.charge > 0) {
        gradient.addColorStop(0, '#FF4757');
        gradient.addColorStop(1, '#FF6B81');
      } else {
        gradient.addColorStop(0, '#2ED573');
        gradient.addColorStop(1, '#7BED9F');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      if (p.selected && !p.reached) {
        const blink = Math.sin(this.time * Math.PI * 2 / 0.5);
        ctx.globalAlpha = blink > 0 ? 1 : 0.3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }
  }

  private drawSparks(ctx: CanvasRenderingContext2D, sparks: Spark[]): void {
    for (const s of sparks) {
      const alpha = s.life / s.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPulseEffects(ctx: CanvasRenderingContext2D, particleSystem: ParticleSystem): void {
    for (const p of particleSystem.particles) {
      if (!p.pulseEffect) continue;
      const pe = p.pulseEffect;
      const progress = pe.elapsed / pe.duration;
      const radius = 10 + progress * 20;
      const alpha = 1 - progress;

      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = p.charge > 0 ? '#FF4757' : '#2ED573';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pe.x, pe.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawDragLine(
    ctx: CanvasRenderingContext2D,
    particleSystem: ParticleSystem,
    dragStart: { x: number; y: number },
  ): void {
    const idx = particleSystem.getSelectedIndex();
    if (idx < 0) return;
    const p = particleSystem.particles[idx];
    if (p.reached) return;

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#00D2FF';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(dragStart.x, dragStart.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  private drawLevelComplete(
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    particleSystem: ParticleSystem,
  ): void {
    if (elapsed < 2) {
      const alpha = Math.min(elapsed / 0.5, 1);
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#00FF88';
      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LEVEL CLEAR', this.width / 2, this.height / 2);

      for (const p of particleSystem.particles) {
        const converge = Math.min(elapsed / 1.5, 1);
        const px = p.x + (400 - p.x) * converge;
        const py = p.y + (300 - p.y) * converge;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 4);
        gradient.addColorStop(0, '#00FF88');
        gradient.addColorStop(1, '#FFD700');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, 4 * (1 - converge * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FF4757';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TIME UP', this.width / 2, this.height / 2 - 20);

    ctx.fillStyle = '#A0A0A0';
    ctx.font = '16px monospace';
    ctx.fillText('Press R to restart', this.width / 2, this.height / 2 + 20);
    ctx.textAlign = 'start';
  }

  private drawGameWin(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN!', this.width / 2, this.height / 2 - 20);

    ctx.fillStyle = '#A0A0A0';
    ctx.font = '16px monospace';
    ctx.fillText('All levels completed', this.width / 2, this.height / 2 + 20);
    ctx.textAlign = 'start';
  }

  private drawUI(
    ctx: CanvasRenderingContext2D,
    levelIndex: number,
    particleSystem: ParticleSystem,
    fps: number,
    timeLeft: number,
    gameState: GameState,
  ): void {
    if (gameState === 'gameOver' || gameState === 'gameWin') return;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${levelIndex + 1}`, 12, 30);

    ctx.fillStyle = '#A0A0A0';
    ctx.font = '14px monospace';
    ctx.fillText(`Particles: ${particleSystem.getActiveCount()}/${particleSystem.particles.length}`, 12, 50);

    const fpsColor = fps < 55 ? '#FF0000' : '#00FF00';
    ctx.fillStyle = fpsColor;
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${Math.round(fps)}`, this.width - 12, 20);
    ctx.textAlign = 'left';

    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const isLast10 = timeLeft <= 10;
    if (isLast10) {
      const blink = Math.sin(this.time * Math.PI * 4) > 0;
      ctx.fillStyle = blink ? '#FF4757' : 'transparent';
    } else {
      ctx.fillStyle = '#FFEAA7';
    }
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, this.width - 12, this.height - 12);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#A0A0A0';
    ctx.font = '11px monospace';
    ctx.fillText('Space: switch charge | Tab: select | Drag: push | R: restart', 12, this.height - 12);
  }

  updateTargetFlashes(dt: number, reachedIndices: number[]): void {
    for (const idx of reachedIndices) {
      const existing = this.targetFlashes.find(f => f.index === idx);
      if (!existing) {
        this.targetFlashes.push({ index: idx, elapsed: 0, count: 0 });
      }
    }

    this.targetFlashes = this.targetFlashes.filter(f => {
      f.elapsed += dt;
      if (f.elapsed >= 0.15) {
        f.elapsed = 0;
        f.count++;
      }
      return f.count < 3;
    });
  }

  resetTargetState(): void {
    this.completedTargets.clear();
    this.targetFlashes = [];
  }
}
