import type { PlayerData } from './Player';
import type { GameEntity, ScorePopup } from './ObstacleManager';

type RenderState = {
  score: number;
  combo: number;
  gameOver: boolean;
  highScore: number;
  gameSpeed: number;
  beatProgress: number;
  beatIndex: number;
};

type PulseRing = {
  startTime: number;
  duration: number;
  maxRadius: number;
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private groundY: number = 450;
  private trackOffset: number = 0;
  private pulseRings: PulseRing[] = [];
  private lastTime: number = 0;
  private comboPulse: number = 0;
  private gameOverTextProgress: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.groundY = this.height * 0.75;
  }

  public getGroundY(): number {
    return this.groundY;
  }

  public getWidth(): number {
    return this.width;
  }

  public setHighQuality(high: boolean): void {
    // Quality mode placeholder for future implementation
  }

  public onBeat(time: number): void {
    this.pulseRings.push({
      startTime: time,
      duration: 0.2,
      maxRadius: Math.max(this.width, this.height) * 0.6
    });
  }

  public render(
    dt: number,
    currentTime: number,
    player: PlayerData,
    playerParticles: Array<{ x: number; y: number; size: number; alpha: number }>,
    entities: GameEntity[],
    scorePopups: ScorePopup[],
    state: RenderState
  ): void {
    this.lastTime = currentTime;
    this.trackOffset += state.gameSpeed * dt;
    this.trackOffset %= 60;
    this.updatePulseRings(currentTime);
    this.comboPulse += dt * 4;

    if (state.gameOver) {
      this.gameOverTextProgress = Math.min(1, this.gameOverTextProgress + dt * 3);
    } else {
      this.gameOverTextProgress = 0;
    }

    this.drawBackground();
    this.drawTrack();
    this.drawPulseRings(currentTime);
    this.drawEntities(entities, currentTime);
    this.drawPlayer(player);
    this.drawPlayerParticles(playerParticles);
    this.drawScorePopups(scorePopups);
    this.drawUI(state);

    if (state.gameOver) {
      this.drawGameOver(state);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      50,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#2d1b69');
    gradient.addColorStop(0.5, '#1a1a4e');
    gradient.addColorStop(1, '#0d0d2b');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137 + this.trackOffset * 0.2) % this.width;
      const y = (i * 89) % (this.groundY - 50);
      const size = (i % 3) + 1;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawTrack(): void {
    const trackY = this.groundY;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, trackY);
    this.ctx.lineTo(this.width, trackY);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([20, 20]);
    this.ctx.lineDashOffset = -this.trackOffset;

    this.ctx.beginPath();
    this.ctx.moveTo(0, trackY - 40);
    this.ctx.lineTo(this.width, trackY - 40);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, trackY + 40);
    this.ctx.lineTo(this.width, trackY + 40);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
    this.ctx.lineDashOffset = 0;
  }

  private updatePulseRings(currentTime: number): void {
    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const ring = this.pulseRings[i];
      if (currentTime - ring.startTime > ring.duration) {
        this.pulseRings.splice(i, 1);
      }
    }
  }

  private drawPulseRings(currentTime: number): void {
    for (const ring of this.pulseRings) {
      const progress = (currentTime - ring.startTime) / ring.duration;
      const radius = ring.maxRadius * progress;
      const alpha = 0.4 * (1 - progress);

      this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawEntities(entities: GameEntity[], currentTime: number): void {
    for (const entity of entities) {
      const age = currentTime - entity.spawnTime;
      const warningProgress = Math.min(1, age / entity.warningDuration);

      if (warningProgress < 1) {
        this.drawWarningCircle(entity, warningProgress);
      }

      if (entity.state === 'active' && !entity.collected) {
        this.drawEntity(entity);
      }

      this.drawEntityParticles(entity);
    }
  }

  private drawWarningCircle(entity: GameEntity, progress: number): void {
    const centerX = entity.x + entity.width / 2;
    const centerY = entity.y - entity.height / 2;
    const maxRadius = entity.width * 1.5;
    const radius = maxRadius * progress;
    const alpha = 0.8 * (1 - progress);

    this.ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawEntity(entity: GameEntity): void {
    switch (entity.type) {
      case 'spike':
        this.drawSpike(entity);
        break;
      case 'lowWall':
        this.drawLowWall(entity);
        break;
      case 'horizontalBar':
        this.drawHorizontalBar(entity);
        break;
      case 'normal':
        this.drawNormalCoin(entity);
        break;
      case 'beat':
        this.drawBeatCoin(entity);
        break;
    }
  }

  private drawSpike(entity: GameEntity): void {
    this.ctx.fillStyle = '#ef4444';
    this.ctx.beginPath();
    this.ctx.moveTo(entity.x + entity.width / 2, entity.y - entity.height);
    this.ctx.lineTo(entity.x, entity.y);
    this.ctx.lineTo(entity.x + entity.width, entity.y);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(entity.x + entity.width / 2, entity.y - entity.height);
    this.ctx.lineTo(entity.x + entity.width * 0.3, entity.y - entity.height * 0.3);
    this.ctx.lineTo(entity.x + entity.width * 0.5, entity.y - entity.height * 0.3);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawLowWall(entity: GameEntity): void {
    this.ctx.fillStyle = '#6b7280';
    this.ctx.fillRect(entity.x, entity.y - entity.height, entity.width, entity.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(entity.x + 4, entity.y - entity.height + 4, entity.width - 8, 8);

    this.ctx.strokeStyle = '#4b5563';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(entity.x, entity.y - entity.height, entity.width, entity.height);
  }

  private drawHorizontalBar(entity: GameEntity): void {
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(entity.x, entity.y - entity.height, entity.width, entity.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(entity.x + 4, entity.y - entity.height + 3, entity.width - 8, 6);

    this.ctx.fillStyle = '#1d4ed8';
    this.ctx.fillRect(entity.x, entity.y - 4, entity.width, 4);
  }

  private drawNormalCoin(entity: GameEntity): void {
    const centerX = entity.x + entity.width / 2;
    const centerY = entity.y - entity.height / 2;
    const radius = entity.width / 2;

    const glowGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius * 1.8
    );
    glowGradient.addColorStop(0, 'rgba(250, 204, 21, 0.4)');
    glowGradient.addColorStop(1, 'rgba(250, 204, 21, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
    this.ctx.fill();

    const scaleX = Math.cos(entity.rotation) * 0.5 + 0.5;
    const scaledRadiusX = radius * (0.5 + scaleX * 0.5);

    this.ctx.fillStyle = '#fbbf24';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, scaledRadiusX, radius, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#f59e0b';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, scaledRadiusX * 0.6, radius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#fcd34d';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX - scaledRadiusX * 0.2, centerY - radius * 0.2, scaledRadiusX * 0.2, radius * 0.2, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawBeatCoin(entity: GameEntity): void {
    const centerX = entity.x + entity.width / 2;
    const centerY = entity.y - entity.height / 2;
    const outerRadius = entity.width / 2;
    const innerRadius = outerRadius * 0.4;

    const glowGradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, outerRadius * 2.5
    );
    glowGradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
    glowGradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, outerRadius * 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    const flash = Math.sin(entity.rotation * 3) * 0.3 + 0.7;
    const points = 5;
    const angleOffset = entity.rotation;

    this.ctx.fillStyle = `rgba(168, 85, 247, ${flash})`;
    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = angleOffset + (Math.PI * i) / points - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = `rgba(216, 180, 254, ${flash})`;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, innerRadius * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawEntityParticles(entity: GameEntity): void {
    for (const p of entity.particles) {
      const px = entity.x + entity.width / 2 + p.x;
      const py = entity.y - entity.height / 2 + p.y;

      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(px, py, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  private drawPlayer(player: PlayerData): void {
    this.ctx.save();

    const centerX = player.x + player.width / 2;
    const centerY = player.y - player.height / 2;

    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(player.rotation);

    this.ctx.fillStyle = '#ef4444';
    this.ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(-player.width / 2 + 4, -player.height / 2 + 4, player.width - 8, 8);

    this.ctx.fillStyle = 'white';
    const eyeY = -player.height * 0.25;
    const eyeSize = 6;
    this.ctx.fillRect(-player.width * 0.25 - eyeSize / 2, eyeY, eyeSize, eyeSize);
    this.ctx.fillRect(player.width * 0.25 - eyeSize / 2, eyeY, eyeSize, eyeSize);

    if (player.state === 'running') {
      this.drawRunningLegs(player);
    }

    this.ctx.restore();
  }

  private drawRunningLegs(player: PlayerData): void {
    const legWidth = 8;
    const legHeight = player.height * 0.3;
    const legY = player.height / 2;

    const frame = player.runFrame;
    const offsets = [
      { front: -3, back: 3 },
      { front: 0, back: 0 },
      { front: 3, back: -3 },
      { front: 0, back: 0 }
    ];

    const offset = offsets[frame];

    this.ctx.fillStyle = '#dc2626';
    this.ctx.fillRect(-player.width * 0.25 - legWidth / 2, legY - 4 + offset.front, legWidth, legHeight - offset.front);
    this.ctx.fillRect(player.width * 0.25 - legWidth / 2, legY - 4 + offset.back, legWidth, legHeight - offset.back);
  }

  private drawPlayerParticles(particles: Array<{ x: number; y: number; size: number; alpha: number }>): void {
    for (const p of particles) {
      this.ctx.fillStyle = 'white';
      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }

  private drawScorePopups(popups: ScorePopup[]): void {
    for (const popup of popups) {
      this.ctx.save();
      this.ctx.globalAlpha = popup.alpha;
      this.ctx.fillStyle = popup.value >= 50 ? '#a855f7' : '#fbbf24';
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(`+${popup.value}`, popup.x, popup.y);
      this.ctx.restore();
    }
  }

  private drawUI(state: RenderState): void {
    this.ctx.save();

    const isHighCombo = state.combo > 5;
    let scale = 1;

    if (isHighCombo) {
      scale = 1 + Math.sin(this.comboPulse) * 0.1;
    }

    this.ctx.save();
    this.ctx.translate(40, 50);
    this.ctx.scale(scale, scale);

    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = isHighCombo ? '#f97316' : 'white';
    this.ctx.font = 'bold 48px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${state.score}`, 0, 0);

    this.ctx.restore();

    if (state.combo > 0) {
      this.ctx.fillStyle = isHighCombo ? '#f97316' : '#9ca3af';
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`连击 x${state.combo}`, 40, 80);
    }

    this.ctx.fillStyle = '#6b7280';
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`最高分: ${state.highScore}`, this.width - 30, 40);

    this.ctx.restore();
  }

  private drawGameOver(state: RenderState): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 56px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#ef4444';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('游戏结束', centerX, centerY - 80);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#fbbf24';
    this.ctx.font = 'bold 36px "Courier New", monospace';
    this.ctx.fillText(`得分: ${state.score}`, centerX, centerY - 10);

    const highScoreText = `最高纪录: ${state.highScore}`;
    const visibleChars = Math.floor(highScoreText.length * this.gameOverTextProgress);

    if (visibleChars > 0) {
      this.ctx.fillStyle = '#a855f7';
      this.ctx.font = 'bold 28px "Courier New", monospace';
      this.ctx.fillText(highScoreText.substring(0, visibleChars), centerX, centerY + 40);
    }

    if (this.gameOverTextProgress >= 1) {
      const blink = Math.sin(this.lastTime * 3) > 0;
      if (blink) {
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.font = '20px "Courier New", monospace';
        this.ctx.fillText('按空格键重新开始', centerX, centerY + 100);
      }
    }
  }

  public reset(): void {
    this.pulseRings = [];
    this.gameOverTextProgress = 0;
  }
}

export default Renderer;
