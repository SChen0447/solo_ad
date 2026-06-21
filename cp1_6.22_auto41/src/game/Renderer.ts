import { Player, PlayerState } from './Player';
import { Obstacle } from './Obstacle';
import { PowerUp, ShieldParticle } from './PowerUp';
import { Background } from './Background';

export interface RenderState {
  score: number;
  survivalTime: number;
  flashTimer: number;
  isGameOver: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  public render(
    background: Background,
    player: Player,
    obstacles: Obstacle[],
    powerUps: PowerUp[],
    shieldParticles: ShieldParticle[],
    state: RenderState
  ): void {
    this.clear();
    this.drawBackground();
    this.drawStars(background);
    this.drawPowerUps(powerUps);
    this.drawObstacles(obstacles);
    this.drawShieldParticles(shieldParticles);
    this.drawPlayer(player);
    this.drawUI(state);
    if (state.flashTimer > 0) {
      this.drawCollisionFlash(state.flashTimer);
    }
    if (state.isGameOver) {
      this.drawGameOver(state.score);
    }
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0b0f19');
    gradient.addColorStop(1, '#1a2332');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawStars(background: Background): void {
    const stars = background.getStars();
    for (const star of stars) {
      this.ctx.fillStyle = star.color;
      this.ctx.fillRect(
        Math.floor(star.x),
        Math.floor(star.y),
        star.size,
        star.size
      );
    }
  }

  private drawPlayer(player: Player): void {
    const s = player.state;
    const px = Math.floor(s.x);
    const py = Math.floor(s.y);

    if (s.glowAlpha > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = s.glowAlpha;
      this.ctx.fillStyle = '#00FF00';
      this.ctx.beginPath();
      this.ctx.arc(px + s.width / 2, py + s.height / 2, 25, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.drawEngineFlame(px, py, s);

    this.ctx.fillStyle = '#3498DB';
    this.ctx.fillRect(px + 4, py + 2, 8, 12);
    this.ctx.fillRect(px + 6, py, 4, 2);

    this.ctx.fillStyle = '#E74C3C';
    this.ctx.fillRect(px + 2, py + 6, 4, 6);
    this.ctx.fillRect(px + 10, py + 6, 4, 6);
    this.ctx.fillRect(px + 6, py + 12, 4, 4);

    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillRect(px + 6, py + 4, 4, 4);

    if (s.hasShield) {
      this.ctx.save();
      this.ctx.translate(px + s.width / 2, py + s.height / 2);
      this.ctx.rotate(s.shieldRotation);
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawEngineFlame(px: number, py: number, s: PlayerState): void {
    const flameY = py + 16;
    if (s.flameFrame === 0) {
      this.ctx.fillStyle = '#FF6600';
      this.ctx.fillRect(px + 5, flameY, 2, 3);
      this.ctx.fillRect(px + 9, flameY, 2, 3);
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.fillRect(px + 6, flameY, 1, 2);
      this.ctx.fillRect(px + 10, flameY, 1, 2);
    } else {
      this.ctx.fillStyle = '#FF6600';
      this.ctx.fillRect(px + 5, flameY, 2, 5);
      this.ctx.fillRect(px + 9, flameY, 2, 5);
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.fillRect(px + 6, flameY, 1, 3);
      this.ctx.fillRect(px + 10, flameY, 1, 3);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(px + 6, flameY, 1, 1);
      this.ctx.fillRect(px + 10, flameY, 1, 1);
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    for (const obs of obstacles) {
      const ox = Math.floor(obs.x);
      const oy = Math.floor(obs.y);
      switch (obs.type) {
        case 'rock':
          this.drawRock(ox, oy, obs.width, obs.height);
          break;
        case 'iron':
          this.drawIron(ox, oy, obs.width, obs.height);
          break;
        case 'crystal':
          this.drawCrystal(ox, oy, obs.width, obs.height);
          break;
      }
    }
  }

  private drawRock(x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(x + 2, y, w - 4, h);
    this.ctx.fillRect(x, y + 2, w, h - 4);
    this.ctx.fillStyle = '#A0522D';
    this.ctx.fillRect(x + 4, y + 2, 4, 4);
    this.ctx.fillRect(x + 12, y + 8, 4, 4);
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(x + 8, y + 12, 4, 4);
  }

  private drawIron(x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = '#808080';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = '#A9A9A9';
    this.ctx.fillRect(x + 2, y + 2, 6, 6);
    this.ctx.fillRect(x + 14, y + 4, 4, 4);
    this.ctx.fillStyle = '#696969';
    this.ctx.fillRect(x + 8, y + 12, 8, 6);
    this.ctx.fillRect(x, y + h - 2, w, 2);
    this.ctx.fillRect(x + w - 2, y, 2, h);
  }

  private drawCrystal(x: number, y: number, w: number, h: number): void {
    this.ctx.fillStyle = '#9932CC';
    this.ctx.fillRect(x + w / 2 - 1, y, 2, h);
    this.ctx.fillRect(x + 2, y + 3, w - 4, h - 6);
    this.ctx.fillRect(x, y + 6, w, h - 12);
    this.ctx.fillStyle = '#DA70D6';
    this.ctx.fillRect(x + 4, y + 4, 4, 4);
    this.ctx.fillRect(x + 10, y + 8, 2, 2);
    this.ctx.fillStyle = '#BA55D3';
    this.ctx.fillRect(x + 6, y + 10, 4, 2);
  }

  private drawPowerUps(powerUps: PowerUp[]): void {
    for (const pu of powerUps) {
      const px = Math.floor(pu.x);
      const py = Math.floor(pu.getRenderY());
      if (pu.type === 'speed') {
        this.drawSpeedBoost(px, py);
      } else {
        this.drawShield(px, py);
      }
    }
  }

  private drawSpeedBoost(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    this.ctx.fillRect(x - 1, y - 1, 18, 18);
    this.ctx.fillStyle = '#00FF00';
    this.ctx.fillRect(x + 2, y, 4, 4);
    this.ctx.fillRect(x, y + 4, 6, 2);
    this.ctx.fillRect(x + 4, y + 6, 4, 4);
    this.ctx.fillRect(x + 6, y + 10, 4, 2);
    this.ctx.fillRect(x + 8, y + 12, 4, 4);
    this.ctx.fillStyle = '#90EE90';
    this.ctx.fillRect(x + 4, y + 2, 2, 2);
    this.ctx.fillRect(x + 6, y + 8, 2, 2);
  }

  private drawShield(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
    this.ctx.fillRect(x - 1, y - 1, 18, 18);
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillRect(x + 2, y, 12, 2);
    this.ctx.fillRect(x, y + 2, 16, 8);
    this.ctx.fillRect(x + 2, y + 10, 12, 4);
    this.ctx.fillRect(x + 4, y + 14, 8, 2);
    this.ctx.fillRect(x + 6, y + 16, 4, 1);
    this.ctx.fillStyle = '#FFA500';
    this.ctx.fillRect(x + 4, y + 4, 8, 2);
    this.ctx.fillRect(x + 6, y + 6, 4, 4);
  }

  private drawShieldParticles(particles: ShieldParticle[]): void {
    for (const p of particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.getAlpha();
      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      this.ctx.restore();
    }
  }

  private drawUI(state: RenderState): void {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`SCORE: ${state.score}`, this.canvasWidth - 10, this.canvasHeight - 10);

    this.ctx.textAlign = 'left';
    const minutes = Math.floor(state.survivalTime / 60);
    const seconds = Math.floor(state.survivalTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.ctx.fillText(`TIME: ${timeStr}`, 10, 24);
  }

  private drawCollisionFlash(flashTimer: number): void {
    const alpha = Math.min(1, flashTimer / 0.2) * 0.8;
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(3, 3, this.canvasWidth - 6, this.canvasHeight - 6);
    this.ctx.restore();
  }

  private drawGameOver(score: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 48px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvasWidth / 2, this.canvasHeight / 2 - 40);

    this.ctx.font = '24px monospace';
    this.ctx.fillText(`Final Score: ${score}`, this.canvasWidth / 2, this.canvasHeight / 2 + 10);

    this.ctx.font = '20px monospace';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText('Press SPACE to restart', this.canvasWidth / 2, this.canvasHeight / 2 + 60);
  }
}
