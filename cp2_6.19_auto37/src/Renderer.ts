export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface BallInfo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface RenderState {
  canvasWidth: number;
  canvasHeight: number;
  playerPaddle: { x: number; y: number; width: number; height: number };
  aiPaddle: { x: number; y: number; width: number; height: number };
  ball: BallInfo;
  playerScore: number;
  aiScore: number;
  playerEnergy: number;
  aiEnergy: number;
  isPlayerBoost: boolean;
  isAIBoost: boolean;
  isBoostActive: boolean;
  fps: number;
  gameWinner: 'player' | 'ai' | null;
  isPlayerServing: boolean;
  time: number;
  deltaTime: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: Particle[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public spawnTrailParticle(ball: BallInfo): void {
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed === 0) return;

    const particle: Particle = {
      x: ball.x,
      y: ball.y,
      vx: -(ball.vx / speed) * 50 + (Math.random() - 0.5) * 20,
      vy: -(ball.vy / speed) * 50 + (Math.random() - 0.5) * 20,
      radius: 2 + Math.random() * 2,
      life: 0.3,
      maxLife: 0.3
    };
    this.particles.push(particle);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public clearParticles(): void {
    this.particles = [];
  }

  public render(state: RenderState): void {
    this.updateParticles(state.deltaTime);

    this.drawBackground(state);
    this.drawCourt(state);
    this.drawParticles(this.particles);
    this.drawPaddle(state.playerPaddle, state.isPlayerBoost);
    this.drawPaddle(state.aiPaddle, state.isAIBoost);
    this.drawBall(state.ball, state.isBoostActive);
    this.drawScores(state);
    this.drawEnergyBars(state);
    this.drawFPS(state.fps);
    this.drawBoostBorder(state);

    if (state.gameWinner) {
      this.drawWinnerText(state);
    }
  }

  private drawBackground(state: RenderState): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, state.canvasHeight);
    gradient.addColorStop(0, '#0a0a2a');
    gradient.addColorStop(1, '#1a1a4a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
  }

  private drawCourt(state: RenderState): void {
    this.ctx.save();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 2);
    this.ctx.lineTo(state.canvasWidth, 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(0, state.canvasHeight - 2);
    this.ctx.lineTo(state.canvasWidth, state.canvasHeight - 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([15, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(state.canvasWidth / 2, 0);
    this.ctx.lineTo(state.canvasWidth / 2, state.canvasHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.restore();
  }

  private drawPaddle(
    paddle: { x: number; y: number; width: number; height: number },
    isBoost: boolean
  ): void {
    this.ctx.save();

    if (isBoost) {
      this.ctx.shadowColor = '#ff4500';
      this.ctx.shadowBlur = 20;
    } else {
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 10;
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    this.ctx.restore();
  }

  private drawBall(ball: { x: number; y: number; radius: number }, isBoost: boolean): void {
    this.ctx.save();

    if (isBoost) {
      this.ctx.shadowColor = '#ff4500';
      this.ctx.shadowBlur = 30;
    } else {
      this.ctx.shadowColor = '#ff4500';
      this.ctx.shadowBlur = 15;
    }

    this.ctx.fillStyle = '#ff4500';
    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    this.ctx.save();
    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      this.ctx.fillStyle = `rgba(255, 69, 0, ${alpha * 0.7})`;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawScores(state: RenderState): void {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    const pulseScale = 1.0 + 0.1 * Math.sin(state.time * Math.PI * 4);

    this.ctx.font = `bold 36px Arial, sans-serif`;
    this.ctx.fillStyle = '#ffffff';

    const aiFontSize = state.isPlayerServing ? 36 : 36 * pulseScale;
    this.ctx.save();
    if (!state.isPlayerServing) {
      this.ctx.translate(state.canvasWidth / 2 - 80, 40);
      this.ctx.scale(pulseScale, pulseScale);
      this.ctx.translate(-(state.canvasWidth / 2 - 80), -40);
    }
    this.ctx.font = `bold ${aiFontSize}px Arial, sans-serif`;
    this.ctx.fillText(state.aiScore.toString(), state.canvasWidth / 2 - 80, 40);
    this.ctx.restore();

    const playerFontSize = state.isPlayerServing ? 36 * pulseScale : 36;
    this.ctx.save();
    if (state.isPlayerServing) {
      this.ctx.translate(state.canvasWidth / 2 + 80, 40);
      this.ctx.scale(pulseScale, pulseScale);
      this.ctx.translate(-(state.canvasWidth / 2 + 80), -40);
    }
    this.ctx.font = `bold ${playerFontSize}px Arial, sans-serif`;
    this.ctx.fillText(state.playerScore.toString(), state.canvasWidth / 2 + 80, 40);
    this.ctx.restore();

    this.ctx.restore();
  }

  private drawEnergyBars(state: RenderState): void {
    this.ctx.save();

    const barWidth = 150;
    const barHeight = 12;
    const barY = 90;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(state.canvasWidth / 2 - barWidth - 30, barY, barWidth, barHeight);
    this.ctx.fillRect(state.canvasWidth / 2 + 30, barY, barWidth, barHeight);

    this.ctx.fillStyle = state.isAIBoost ? '#ff4500' : '#00ff88';
    this.ctx.fillRect(
      state.canvasWidth / 2 - barWidth - 30,
      barY,
      barWidth * (state.aiEnergy / 100),
      barHeight
    );

    this.ctx.fillStyle = state.isPlayerBoost ? '#ff4500' : '#00ff88';
    this.ctx.fillRect(
      state.canvasWidth / 2 + 30,
      barY,
      barWidth * (state.playerEnergy / 100),
      barHeight
    );

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(state.canvasWidth / 2 - barWidth - 30, barY, barWidth, barHeight);
    this.ctx.strokeRect(state.canvasWidth / 2 + 30, barY, barWidth, barHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('AI', state.canvasWidth / 2 - barWidth / 2 - 30, barY + barHeight + 5);
    this.ctx.fillText('玩家', state.canvasWidth / 2 + barWidth / 2 + 30, barY + barHeight + 5);

    this.ctx.restore();
  }

  private drawFPS(fps: number): void {
    this.ctx.save();
    this.ctx.fillStyle = '#ffff00';
    this.ctx.font = '16px Arial, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`FPS: ${fps.toFixed(0)}`, this.canvas.width - 15, 15);
    this.ctx.restore();
  }

  private drawBoostBorder(state: RenderState): void {
    if (!state.isPlayerBoost && !state.isAIBoost) {
      return;
    }

    this.ctx.save();
    const alpha = 0.3 + 0.2 * Math.sin(state.time * Math.PI * (1 / 0.3));
    const borderWidth = 8;

    const gradient = this.ctx.createLinearGradient(0, 0, state.canvasWidth, state.canvasHeight);
    gradient.addColorStop(0, `rgba(255, 69, 0, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 100, 50, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 69, 0, ${alpha})`);

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = borderWidth;
    this.ctx.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      state.canvasWidth - borderWidth,
      state.canvasHeight - borderWidth
    );

    this.ctx.restore();
  }

  private drawWinnerText(state: RenderState): void {
    this.ctx.save();

    const text = state.gameWinner === 'player' ? '你赢了！' : 'AI赢了！';
    const cyclePosition = (state.time % 1) / 1;
    const isVisiblePhase = cyclePosition < 0.5;
    const fadeProgress = isVisiblePhase ? cyclePosition * 2 : (cyclePosition - 0.5) * 2;
    const alpha = isVisiblePhase ? fadeProgress : (1 - fadeProgress);

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const gradient = this.ctx.createLinearGradient(
      state.canvasWidth / 2 - 200,
      state.canvasHeight / 2 - 40,
      state.canvasWidth / 2 + 200,
      state.canvasHeight / 2 + 40
    );
    gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 69, 0, ${alpha})`);
    gradient.addColorStop(1, `rgba(255, 215, 0, ${alpha})`);

    this.ctx.font = 'bold 72px Arial, sans-serif';
    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = '#ff4500';
    this.ctx.shadowBlur = 30;
    this.ctx.fillText(text, state.canvasWidth / 2, state.canvasHeight / 2);

    this.ctx.shadowBlur = 0;
    this.ctx.font = '24px Arial, sans-serif';
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.fillText('按空格键开始新一局', state.canvasWidth / 2, state.canvasHeight / 2 + 70);

    this.ctx.restore();
  }
}
