import { GameState, Particle, StreakLine } from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private canvasWidth: number;
  private canvasHeight: number;
  private streakLines: StreakLine[] = [];
  private streakTimer: number = 0;
  private readonly STREAK_INTERVAL = 0.3;
  private goldParticles: Particle[] = [];
  private readonly MAX_GOLD_PARTICLES = 100;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
  }

  public getStreakLines(): StreakLine[] {
    return this.streakLines;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public emitGoldParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      if (this.goldParticles.length >= this.MAX_GOLD_PARTICLES) break;
      const angle = (Math.PI * 2 * i) / 15;
      const speed = 100 + Math.random() * 150;
      this.goldParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        color: Math.random() < 0.5 ? '#FFD700' : '#FFF8DC',
        life: 0.8,
        maxLife: 0.8
      });
    }
  }

  public update(dt: number, scrollSpeed: number): void {
    this.streakTimer += dt;
    if (this.streakTimer >= this.STREAK_INTERVAL) {
      this.streakTimer = 0;
      this.spawnStreaks();
    }
    for (let i = this.streakLines.length - 1; i >= 0; i--) {
      const s = this.streakLines[i];
      s.x += s.speed * dt;
      if (s.x > this.canvasWidth + 20) {
        this.streakLines.splice(i, 1);
      }
    }

    for (let i = this.goldParticles.length - 1; i >= 0; i--) {
      const p = this.goldParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      if (p.life <= 0) {
        this.goldParticles.splice(i, 1);
      }
    }
  }

  private spawnStreaks(): void {
    const count = 6 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const height = 40 + Math.random() * (this.canvasHeight - 160);
      this.streakLines.push({
        x: -20,
        y: 60 + Math.random() * (this.canvasHeight - 160),
        height,
        speed: 200 + Math.random() * 400,
        alpha: 0.15 + Math.random() * 0.1,
        color: '#00FFFF'
      });
    }
  }

  public render(state: GameState): void {
    this.drawBackground(state.phase);
    this.drawStreakLines();
    this.drawObstacles(state.obstacles);
    this.drawCollectibles(state.collectibles);
    this.drawParticles(state.particles);
    this.drawGoldParticles();
    this.drawPlayer(state);
    this.drawHitBorder(state.player.borderAlpha);
    this.drawScreenFlash(state.screenFlash);
    this.drawUI(state);
    this.drawGameOver(state);
  }

  private drawBackground(phase: number): void {
    const ctx = this.ctx;
    let topColor: string, bottomColor: string;
    if (phase >= 1) {
      topColor = '#1A1A3E';
      bottomColor = '#3D1A4E';
    } else {
      topColor = '#0D0D2B';
      bottomColor = '#1A1A3E';
    }
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawStreakLines(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 2;
    for (const s of this.streakLines) {
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + s.height);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawObstacles(obstacles: GameState['obstacles']): void {
    const ctx = this.ctx;
    ctx.save();
    for (const o of obstacles) {
      ctx.fillStyle = o.color;
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 20;
      ctx.fillRect(o.x, o.y, o.width, o.height);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FF66AA';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x + 2, o.y + 2, o.width - 4, o.height - 4);
    }
    ctx.restore();
  }

  private drawCollectibles(collectibles: GameState['collectibles']): void {
    const ctx = this.ctx;
    ctx.save();
    for (const c of collectibles) {
      const pulse = 1.0 + 0.2 * Math.sin(c.pulsePhase);
      const r = c.radius * pulse;
      const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 2.5);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.3, '#FFFF99');
      gradient.addColorStop(0.6, '#FFD700');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    ctx.save();
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGoldParticles(): void {
    const ctx = this.ctx;
    ctx.save();
    for (const p of this.goldParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPlayer(state: GameState): void {
    const p = state.player;
    if (!p.isVisible) return;
    const ctx = this.ctx;
    ctx.save();

    const glowColor = p.isSlowed ? '#FF0000' : '#00FFFF';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 35;

    const innerColor = p.isSlowed ? '#FF3333' : '#00FFFF';
    const outerColor = p.isSlowed ? '#FF0000' : '#ff00ff';

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(0.6, innerColor);
    gradient.addColorStop(1, outerColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawHitBorder(alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    const w = 10;
    ctx.save();
    ctx.globalAlpha = alpha;

    const topGrad = ctx.createLinearGradient(0, 0, 0, w);
    topGrad.addColorStop(0, 'rgba(255,0,0,1)');
    topGrad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, this.canvasWidth, w);

    const bottomGrad = ctx.createLinearGradient(0, this.canvasHeight - w, 0, this.canvasHeight);
    bottomGrad.addColorStop(0, 'rgba(255,0,0,0)');
    bottomGrad.addColorStop(1, 'rgba(255,0,0,1)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, this.canvasHeight - w, this.canvasWidth, w);

    const leftGrad = ctx.createLinearGradient(0, 0, w, 0);
    leftGrad.addColorStop(0, 'rgba(255,0,0,1)');
    leftGrad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, w, this.canvasHeight);

    const rightGrad = ctx.createLinearGradient(this.canvasWidth - w, 0, this.canvasWidth, 0);
    rightGrad.addColorStop(0, 'rgba(255,0,0,0)');
    rightGrad.addColorStop(1, 'rgba(255,0,0,1)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(this.canvasWidth - w, 0, w, this.canvasHeight);

    ctx.restore();
  }

  private drawScreenFlash(flash: number): void {
    if (flash <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = flash;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();
  }

  private drawUI(state: GameState): void {
    const ctx = this.ctx;
    ctx.save();

    const scoreScale = state.scoreAnim.scale;
    ctx.font = `bold ${Math.floor(28 * scoreScale)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = 'rgba(0,255,255,0.3)';
    ctx.lineWidth = 3;
    const scoreText = `得分: ${state.score}`;
    const cx = this.canvasWidth / 2;
    ctx.strokeText(scoreText, cx, 20);
    ctx.fillText(scoreText, cx, 20);

    ctx.shadowBlur = 0;
    const progress = Math.min(state.score / 100, 1);
    const barY = this.canvasHeight - 18;
    const barW = this.canvasWidth - 40;
    const barX = 20;
    const barH = 6;
    const radius = 3;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this.roundRect(ctx, barX, barY, barW, barH, radius);
    ctx.fill();

    const fillW = Math.max(0, barW * progress);
    if (fillW > 0) {
      const progGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      progGrad.addColorStop(0, '#00FFFF');
      progGrad.addColorStop(1, '#FF00FF');
      ctx.fillStyle = progGrad;
      if (progress >= 1) {
        const pulse = 0.6 + 0.4 * Math.sin(state.progressPulse * Math.PI * 4);
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20 * pulse;
      } else {
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 8;
      }
      this.roundRect(ctx, barX, barY, fillW, barH, radius);
      ctx.fill();
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawGameOver(state: GameState): void {
    if (!state.isGameOver) return;
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const panelW = 400;
    const panelH = 380;
    const panelX = (this.canvasWidth - panelW) / 2;
    const panelY = (this.canvasHeight - panelH) / 2;
    const panelR = 16;

    ctx.fillStyle = 'rgba(26, 26, 26, 0.85)';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 30;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, panelR);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(0,255,255,0.4)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, panelX + 2, panelY + 2, panelW - 4, panelH - 4, panelR - 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = "bold 32px 'Segoe UI', sans-serif";
    ctx.fillStyle = '#00FFFF';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 15;
    ctx.fillText('游戏结束', this.canvasWidth / 2, panelY + 30);
    ctx.shadowBlur = 0;

    ctx.font = "20px 'Segoe UI', sans-serif";
    const contentY = panelY + 90;
    const labels = ['最终得分', '收集光球', '最高记录'];
    const values = [
      state.score.toString(),
      state.collectedCount.toString(),
      localStorage.getItem('neonRunnerHighScore') || '0'
    ];

    for (let i = 0; i < 3; i++) {
      const y = contentY + i * 55;
      ctx.fillStyle = '#AAAAAA';
      ctx.font = "18px 'Segoe UI', sans-serif";
      ctx.fillText(labels[i], this.canvasWidth / 2, y);
      ctx.font = "bold 28px 'Segoe UI', sans-serif";
      ctx.fillStyle = i === 2 ? '#FFD700' : '#FFFFFF';
      ctx.shadowColor = i === 2 ? '#FFD700' : '#FF00FF';
      ctx.shadowBlur = 10;
      ctx.fillText(values[i], this.canvasWidth / 2, y + 24);
      ctx.shadowBlur = 0;
    }

    const btnW = 180;
    const btnH = 50;
    const btnX = (this.canvasWidth - btnW) / 2;
    const btnY = panelY + panelH - btnH - 30;
    const btnR = 25;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#00FFFF');
    btnGrad.addColorStop(1, '#FF00FF');
    ctx.fillStyle = btnGrad;
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 20;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, btnR);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "bold 20px 'Segoe UI', sans-serif";
    ctx.fillStyle = '#0D0D2B';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', this.canvasWidth / 2, btnY + btnH / 2);

    ctx.restore();
  }
}
