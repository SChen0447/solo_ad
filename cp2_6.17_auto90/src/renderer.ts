import { Player } from './player';
import { Bullet, Particle, Star, GameState,
  CANVAS_WIDTH, CANVAS_HEIGHT, STAR_COUNT, COLORS,
  GameMode
} from './types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private stars: Star[];
  private backgroundGradient: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = CANVAS_WIDTH;
    this.offscreenCanvas.height = CANVAS_HEIGHT;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.stars = [];
    this.initStars();
    this.initBackground();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push(new Star(CANVAS_WIDTH, CANVAS_HEIGHT));
    }
  }

  private initBackground(): void {
    this.backgroundGradient = this.offscreenCtx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    this.backgroundGradient.addColorStop(0, COLORS.backgroundTop);
    this.backgroundGradient.addColorStop(1, COLORS.backgroundBottom);
  }

  render(
    state: GameState,
    players: Player[],
    bullets: Bullet[],
    particles: Particle[],
    fps: number,
    countdownAnimProgress: number = 0
  ): void {
    this.drawBackground();
    this.drawStars();

    for (const player of players) {
      this.drawPlayer(player);
    }

    for (const bullet of bullets) {
      this.drawBullet(bullet);
    }

    for (const particle of particles) {
      this.drawParticle(particle);
    }

    this.drawScores(players);
    this.drawFps(fps);

    if (state.mode === 'countdown') {
      this.drawCountdown(state.countdown, countdownAnimProgress);
    }

    this.swapBuffers();
  }

  updateStars(deltaTime: number): void {
    for (const star of this.stars) {
      star.update(deltaTime, CANVAS_HEIGHT);
    }
  }

  private drawBackground(): void {
    if (this.backgroundGradient) {
      this.offscreenCtx.fillStyle = this.backgroundGradient;
      this.offscreenCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  private drawStars(): void {
    for (const star of this.stars) {
      this.offscreenCtx.globalAlpha = star.brightness;
      this.offscreenCtx.fillStyle = '#ffffff';
      this.offscreenCtx.beginPath();
      this.offscreenCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.offscreenCtx.fill();
    }
    this.offscreenCtx.globalAlpha = 1;
  }

  private drawPlayer(player: Player): void {
    player.draw(this.offscreenCtx);
  }

  private drawBullet(bullet: Bullet): void {
    this.offscreenCtx.save();
    this.offscreenCtx.shadowColor = COLORS.bulletGlow;
    this.offscreenCtx.shadowBlur = 8;
    this.offscreenCtx.fillStyle = bullet.color;
    this.offscreenCtx.beginPath();
    this.offscreenCtx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    this.offscreenCtx.fill();
    this.offscreenCtx.restore();
  }

  private drawParticle(particle: Particle): void {
    const alpha = particle.life / particle.maxLife;
    this.offscreenCtx.globalAlpha = alpha;
    this.offscreenCtx.fillStyle = particle.color;
    this.offscreenCtx.beginPath();
    this.offscreenCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    this.offscreenCtx.fill();
    this.offscreenCtx.globalAlpha = 1;
  }

  private drawFps(fps: number): void {
    this.offscreenCtx.font = '14px sans-serif';
    this.offscreenCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.offscreenCtx.textAlign = 'right';
    this.offscreenCtx.fillText(`FPS: ${fps}`, CANVAS_WIDTH - 10, 24);
  }

  private drawScores(players: Player[]): void {
    if (players.length < 2) return;

    this.offscreenCtx.font = 'bold 24px sans-serif';
    this.offscreenCtx.textAlign = 'left';
    
    this.offscreenCtx.fillStyle = COLORS.primary;
    this.offscreenCtx.fillText(`${players[0].name}: ${players[0].score}`, 20, 35);
    
    this.offscreenCtx.textAlign = 'right';
    this.offscreenCtx.fillStyle = COLORS.primary;
    this.offscreenCtx.fillText(`${players[1].name}: ${players[1].score}`, CANVAS_WIDTH - 20, 35);
  }

  private drawCountdown(count: number, animProgress: number): void {
    const scale = 1 + Math.sin(animProgress * Math.PI) * 0.3;
    const alpha = count > 0 ? 1 : Math.max(0, 1 - animProgress);

    this.offscreenCtx.save();
    this.offscreenCtx.globalAlpha = alpha;
    this.offscreenCtx.font = 'bold 120px sans-serif';
    this.offscreenCtx.fillStyle = '#ffffff';
    this.offscreenCtx.textAlign = 'center';
    this.offscreenCtx.textBaseline = 'middle';
    
    this.offscreenCtx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.offscreenCtx.scale(scale, scale);
    
    const text = count > 0 ? count.toString() : '开始!';
    this.offscreenCtx.fillText(text, 0, 0);
    this.offscreenCtx.restore();
  }

  private swapBuffers(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.offscreenCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}
