import type { GameState } from '../game/GameEngine';
import type { Obstacle } from '../game/ObstacleManager';
import type { EnergyBall } from '../game/EnergyManager';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private stars: { x: number; y: number; size: number; alpha: number }[] = [];
  private bgOffset = 0;
  private readonly BG_COLOR = '#0a0a2e';
  private readonly NEON_COLOR = '#00ffcc';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
  }

  private drawBackground(scrollSpeed: number): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#1a1a4e');
    gradient.addColorStop(1, '#0a0a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.bgOffset -= scrollSpeed * 0.3;
    if (this.bgOffset <= -this.canvas.width) this.bgOffset = 0;

    for (const star of this.stars) {
      const x = ((star.x + this.bgOffset) % this.canvas.width + this.canvas.width) % this.canvas.width;
      this.ctx.beginPath();
      this.ctx.arc(x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.fill();
    }

    const nearOffset = this.bgOffset * 2;
    this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.1)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const baseY = (this.canvas.height / 8) * i + this.canvas.height / 16;
      this.ctx.beginPath();
      for (let x = -100; x < this.canvas.width + 100; x += 60) {
        const offsetX = ((x + nearOffset) % (this.canvas.width + 200)) - 100;
        const y = baseY + Math.sin((x + nearOffset) * 0.02) * 15;
        if (x === -100) {
          this.ctx.moveTo(offsetX, y);
        } else {
          this.ctx.lineTo(offsetX, y);
        }
      }
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(0, 255, 204, 0.08)';
    for (let i = 0; i < 12; i++) {
      const x = (((i * 120 + nearOffset * 1.5) % (this.canvas.width + 100)) + this.canvas.width + 100) % (this.canvas.width + 100) - 50;
      const y = (this.canvas.height / 12) * ((i * 3) % 12) + 40;
      this.ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (j * Math.PI) / 3;
        const px = x + Math.cos(angle) * 12;
        const py = y + Math.sin(angle) * 12;
        if (j === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawObstacle(obs: Obstacle, fadeAlpha: number): void {
    this.ctx.save();
    this.ctx.translate(obs.x, obs.y);
    this.ctx.rotate(obs.rotation);
    this.ctx.globalAlpha = fadeAlpha;

    this.ctx.shadowColor = obs.color;
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    for (let i = 0; i < obs.vertices.length; i++) {
      const v = obs.vertices[i];
      if (i === 0) this.ctx.moveTo(v.x, v.y);
      else this.ctx.lineTo(v.x, v.y);
    }
    this.ctx.closePath();

    this.ctx.fillStyle = obs.color;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawEnergyBall(ball: EnergyBall, pulseScale: number): void {
    if (ball.collected) return;

    const r = ball.radius * pulseScale;
    const gradient = this.ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, r * 2);
    gradient.addColorStop(0, 'rgba(0, 255, 204, 1)');
    gradient.addColorStop(0.4, 'rgba(0, 255, 204, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 255, 204, 0)');

    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, r * 2, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    this.ctx.fillStyle = this.NEON_COLOR;
    this.ctx.shadowColor = this.NEON_COLOR;
    this.ctx.shadowBlur = 10;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawPlayer(state: GameState): void {
    const player = state.player;
    const squish = state.getPlayerSquishScale();

    for (let i = player.state.trail.length - 1; i >= 0; i--) {
      const point = player.state.trail[i];
      const alpha = point.alpha * 0.5;
      const size = player.state.radius * (1 - i * 0.06);
      const gradient = this.ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
      gradient.addColorStop(0, `rgba(0, 255, 204, ${alpha})`);
      gradient.addColorStop(1, `rgba(0, 255, 204, 0)`);
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    this.ctx.save();
    this.ctx.translate(player.state.x, player.state.y);
    this.ctx.scale(squish.scaleX, squish.scaleY);

    const outerGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, player.state.radius * 2);
    outerGlow.addColorStop(0, 'rgba(0, 255, 204, 0.8)');
    outerGlow.addColorStop(0.5, 'rgba(0, 255, 204, 0.3)');
    outerGlow.addColorStop(1, 'rgba(0, 255, 204, 0)');
    this.ctx.beginPath();
    this.ctx.arc(0, 0, player.state.radius * 2, 0, Math.PI * 2);
    this.ctx.fillStyle = outerGlow;
    this.ctx.fill();

    const bodyGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, player.state.radius);
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.3, this.NEON_COLOR);
    bodyGradient.addColorStop(1, '#006655');
    this.ctx.beginPath();
    this.ctx.arc(0, 0, player.state.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = bodyGradient;
    this.ctx.shadowColor = this.NEON_COLOR;
    this.ctx.shadowBlur = 20;
    this.ctx.fill();

    this.ctx.restore();
  }

  public render(state: GameState): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground(state.scrollSpeed);

    for (const ball of state.energyBalls) {
      this.drawEnergyBall(ball, state.getEnergyPulseScale(ball));
    }

    for (const obs of state.obstacles) {
      this.drawObstacle(obs, state.getObstacleFadeAlpha(obs));
    }

    this.drawPlayer(state);
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initStars();
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
