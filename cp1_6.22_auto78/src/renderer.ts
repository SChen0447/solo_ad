import type { Penguin, IceFloe, Fish, Particle, GameStatus } from './game';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private readonly GAME_WIDTH = 800;
  private readonly GAME_HEIGHT = 600;
  private readonly WAVE_AMPLITUDE = 30;
  private readonly WAVE_PERIOD = 80;
  private readonly PIXEL_FONT = "'Press Start 2P', monospace";

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(
    penguin: Penguin,
    iceFloes: IceFloe[],
    fishes: Fish[],
    particles: Particle[],
    score: number,
    targetScore: number,
    level: number,
    energy: number,
    maxEnergy: number,
    wavePhase: number,
    gameStatus: GameStatus
  ): void {
    this.clearCanvas();
    this.drawBackground();
    this.drawWaves(wavePhase);
    this.drawIceFloes(iceFloes);
    this.drawFishes(fishes);
    this.drawPenguin(penguin);
    this.drawParticles(particles);
    this.drawUI(score, targetScore, level, energy, maxEnergy);
    this.drawGameStatusOverlay(gameStatus, score, targetScore, level);
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.GAME_HEIGHT);
    gradient.addColorStop(0, '#bfdbfe');
    gradient.addColorStop(1, '#1e3a8a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
  }

  private drawWaves(phase: number): void {
    const waveColors = [
      { color: 'rgba(147, 197, 253, 0.4)', baseY: 520, offset: 0 },
      { color: 'rgba(96, 165, 250, 0.5)', baseY: 545, offset: 20 },
      { color: 'rgba(59, 130, 246, 0.6)', baseY: 570, offset: 40 },
    ];

    for (const wave of waveColors) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.GAME_HEIGHT);
      this.ctx.lineTo(0, wave.baseY);

      for (let x = 0; x <= this.GAME_WIDTH; x += 2) {
        const adjustedPhase = phase * 40 + wave.offset;
        const y = wave.baseY + Math.sin((x + adjustedPhase) / this.WAVE_PERIOD * Math.PI * 2) * this.WAVE_AMPLITUDE;
        this.ctx.lineTo(x, y);
      }

      this.ctx.lineTo(this.GAME_WIDTH, this.GAME_HEIGHT);
      this.ctx.closePath();
      this.ctx.fillStyle = wave.color;
      this.ctx.fill();
    }
  }

  private drawIceFloes(iceFloes: IceFloe[]): void {
    for (const floe of iceFloes) {
      this.drawIceFloe(floe);
    }
  }

  private drawIceFloe(floe: IceFloe): void {
    const ctx = this.ctx;
    const centerX = floe.x + floe.width / 2;
    const centerY = floe.y + floe.height / 2 + floe.sinkOffset;
    const rx = floe.width / 2;
    const ry = floe.height / 2;

    ctx.save();
    ctx.globalAlpha = floe.opacity;

    const gradient = ctx.createRadialGradient(
      centerX - rx * 0.2, centerY - ry * 0.2, 5,
      centerX, centerY, Math.max(rx, ry)
    );
    gradient.addColorStop(0, '#e2e8f0');
    gradient.addColorStop(0.6, '#c3d9f0');
    gradient.addColorStop(1, '#90cdf4');

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(centerX, centerY - ry * 0.3, rx * 0.7, ry * 0.4, 0, Math.PI * 0.8, Math.PI * 1.3);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private drawFishes(fishes: Fish[]): void {
    for (const fish of fishes) {
      this.drawFish(fish);
    }
  }

  private drawFish(fish: Fish): void {
    if (fish.scale <= 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.scale(fish.scale, fish.scale);

    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f6ad55';
    ctx.fill();
    ctx.strokeStyle = '#dd6b20';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(22, -8);
    ctx.lineTo(22, 8);
    ctx.closePath();
    ctx.fillStyle = '#f6ad55';
    ctx.fill();
    ctx.strokeStyle = '#dd6b20';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-5, -1, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a202c';
    ctx.fill();

    ctx.restore();
  }

  private drawPenguin(penguin: Penguin): void {
    const ctx = this.ctx;
    const drawY = penguin.y - penguin.jumpOffset;
    const swingAngle = penguin.swingTimer > 150 ? 0.08 : -0.08;
    const swingMultiplier = (penguin.swingTimer > 0) ? 1 : 0;

    ctx.save();
    ctx.translate(penguin.x + penguin.width / 2, drawY + penguin.height / 2);

    if (penguin.facingLeft) {
      ctx.scale(-1, 1);
    }
    ctx.rotate(swingAngle * swingMultiplier);

    const h = penguin.height;
    const w = penguin.width;

    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a202c';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 3, w / 2 - 6, h / 2 - 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -h / 2 + 8, w / 2 - 3, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a202c';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-5, -h / 2 + 6, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -h / 2 + 6, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-4, -h / 2 + 7, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1a202c';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -h / 2 + 7, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1a202c';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-3, -h / 2 + 12);
    ctx.lineTo(0, -h / 2 + 17);
    ctx.lineTo(3, -h / 2 + 12);
    ctx.closePath();
    ctx.fillStyle = '#f6ad55';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-w / 2 - 1, -2, 6, 14, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#1a202c';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(w / 2 + 1, -2, 6, 14, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#1a202c';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-6, h / 2 - 3, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f6ad55';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, h / 2 - 3, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f6ad55';
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private drawUI(score: number, targetScore: number, level: number, energy: number, maxEnergy: number): void {
    this.drawScoreBoard(score, targetScore);
    this.drawLevelIndicator(level);
    this.drawEnergyBar(energy, maxEnergy);
  }

  private drawScoreBoard(score: number, targetScore: number): void {
    const ctx = this.ctx;
    const x = 20;
    const y = 20;
    const width = 180;
    const height = 48;
    const radius = 8;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30, 58, 138, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold 14px ${this.PIXEL_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🐟 ${score}/${targetScore}`, x + 15, y + height / 2);

    ctx.restore();
  }

  private drawLevelIndicator(level: number): void {
    const ctx = this.ctx;
    const x = this.GAME_WIDTH - 20;
    const y = 20;
    const width = 100;
    const height = 48;
    const radius = 8;
    const left = x - width;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left + radius, y);
    ctx.lineTo(x - radius, y);
    ctx.quadraticCurveTo(x, y, x, y + radius);
    ctx.lineTo(x, y + height - radius);
    ctx.quadraticCurveTo(x, y + height, x - radius, y + height);
    ctx.lineTo(left + radius, y + height);
    ctx.quadraticCurveTo(left, y + height, left, y + height - radius);
    ctx.lineTo(left, y + radius);
    ctx.quadraticCurveTo(left, y, left + radius, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30, 58, 138, 0.75)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold 14px ${this.PIXEL_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lv.${level}`, left + width / 2, y + height / 2);

    ctx.restore();
  }

  private drawEnergyBar(energy: number, maxEnergy: number): void {
    const ctx = this.ctx;
    const barWidth = 200;
    const barHeight = 12;
    const x = (this.GAME_WIDTH - barWidth) / 2;
    const y = this.GAME_HEIGHT - 40;
    const radius = 4;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + barWidth - radius, y);
    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
    ctx.lineTo(x + barWidth, y + barHeight - radius);
    ctx.quadraticCurveTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight);
    ctx.lineTo(x + radius, y + barHeight);
    ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const fillRatio = Math.max(0, energy / maxEnergy);
    const fillWidth = Math.max(0, (barWidth - 6) * fillRatio);

    if (fillWidth > 0) {
      const energyGradient = ctx.createLinearGradient(x + 3, y, x + barWidth - 3, y);
      energyGradient.addColorStop(0, '#22c55e');
      energyGradient.addColorStop(0.5, '#eab308');
      energyGradient.addColorStop(1, '#ef4444');

      const innerRadius = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3 + innerRadius, y + 3);
      ctx.lineTo(x + 3 + fillWidth - innerRadius, y + 3);
      ctx.quadraticCurveTo(x + 3 + fillWidth, y + 3, x + 3 + fillWidth, y + 3 + innerRadius);
      ctx.lineTo(x + 3 + fillWidth, y + barHeight - 3 - innerRadius);
      ctx.quadraticCurveTo(x + 3 + fillWidth, y + barHeight - 3, x + 3 + fillWidth - innerRadius, y + barHeight - 3);
      ctx.lineTo(x + 3 + innerRadius, y + barHeight - 3);
      ctx.quadraticCurveTo(x + 3, y + barHeight - 3, x + 3, y + barHeight - 3 - innerRadius);
      ctx.lineTo(x + 3, y + 3 + innerRadius);
      ctx.quadraticCurveTo(x + 3, y + 3, x + 3 + innerRadius, y + 3);
      ctx.closePath();
      ctx.fillStyle = energyGradient;
      ctx.fill();
    }

    ctx.font = `10px ${this.PIXEL_FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`ENERGY: ${energy}/${maxEnergy}`, x + barWidth / 2, y - 18);

    ctx.restore();
  }

  private drawGameStatusOverlay(gameStatus: GameStatus, score: number, targetScore: number, level: number): void {
    if (gameStatus === 'playing') return;

    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);

    const centerX = this.GAME_WIDTH / 2;
    const centerY = this.GAME_HEIGHT / 2;

    if (gameStatus === 'victory') {
      ctx.font = `bold 32px ${this.PIXEL_FONT}`;
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎉 VICTORY! 🎉', centerX, centerY - 60);

      ctx.font = `16px ${this.PIXEL_FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Lv.${level} 通关!`, centerX, centerY - 10);
      ctx.fillText(`收集鱼数: ${score}/${targetScore}`, centerX, centerY + 20);
      ctx.fillText('按 Enter 进入下一关', centerX, centerY + 70);
    } else if (gameStatus === 'gameover') {
      ctx.font = `bold 32px ${this.PIXEL_FONT}`;
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💔 GAME OVER', centerX, centerY - 60);

      ctx.font = `16px ${this.PIXEL_FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('能量耗尽了!', centerX, centerY - 10);
      ctx.fillText(`收集鱼数: ${score}/${targetScore}`, centerX, centerY + 20);
      ctx.fillText('按 Enter 重新开始', centerX, centerY + 70);
    }

    ctx.restore();
  }
}
