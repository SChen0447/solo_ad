import { Game } from './game';
import { Level, TILE_SIZE, LEVEL_PIXEL_WIDTH, LEVEL_PIXEL_HEIGHT } from './level';
import { Player } from './player';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number = 1;
  offsetX: number = 0;
  offsetY: number = 0;

  private spikePulseTime: number = 0;
  private mouseHoveringHint: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const hintY = rect.height - 40;
      this.mouseHoveringHint = Math.abs(mouseY - hintY) < 30;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const scaleX = this.canvas.width / LEVEL_PIXEL_WIDTH;
    const scaleY = this.canvas.height / LEVEL_PIXEL_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);

    this.offsetX = (this.canvas.width - LEVEL_PIXEL_WIDTH * this.scale) / 2;
    this.offsetY = (this.canvas.height - LEVEL_PIXEL_HEIGHT * this.scale) / 2;
  }

  render(game: Game, dt: number) {
    const ctx = this.ctx;

    this.spikePulseTime += dt;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    if (game.state === 'rewind') {
      ctx.save();
      ctx.filter = 'grayscale(100%)';
      this.drawLevel(game.level);
      this.drawPlayer(game.player);
      this.drawParticles(game.player);
      ctx.restore();
    } else {
      this.drawLevel(game.level);
      this.drawPlayer(game.player);
      this.drawParticles(game.player);
    }

    if (game.state === 'win') {
      this.drawWinParticles(game);
    }

    ctx.restore();

    this.drawHUD(game);

    if (game.deathFlashTime > 0) {
      const alpha = game.deathFlashTime / 0.2;
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.6})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (game.rewindFlashTime > 0) {
      const alpha = game.rewindFlashTime / 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (game.state === 'menu') {
      this.drawMenu(game);
    }

    if (game.state === 'gameover') {
      this.drawGameOver(game);
    }

    if (game.state === 'win') {
      this.drawWinScreen(game);
    }
  }

  drawLevel(level: Level) {
    const ctx = this.ctx;

    for (let i = 0; i < level.platforms.length; i++) {
      const plat = level.platforms[i];
      const x = plat.x * TILE_SIZE;
      const y = plat.y * TILE_SIZE;
      const w = plat.width * TILE_SIZE;
      const h = plat.height * TILE_SIZE;

      const gradient = ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, '#4a90e2');
      gradient.addColorStop(1, '#0f3460');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x, y, w, 3);
    }

    if (level.bridge.active) {
      ctx.fillStyle = '#44ff88';
      ctx.fillRect(level.bridge.x, level.bridge.y, level.bridge.width, level.bridge.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(level.bridge.x, level.bridge.y, level.bridge.width, 2);
    } else {
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(level.bridge.x, level.bridge.y, level.bridge.width, level.bridge.height);
      ctx.setLineDash([]);
    }

    ctx.fillStyle = level.pressurePlate.activated ? '#44ff88' : '#666666';
    ctx.fillRect(
      level.pressurePlate.x,
      level.pressurePlate.y,
      level.pressurePlate.width,
      level.pressurePlate.height
    );

    for (const spike of level.spikes) {
      this.drawSpike(spike.x * TILE_SIZE, spike.y * TILE_SIZE);
    }

    for (const cp of level.checkpoints) {
      this.drawCheckpoint(cp.x * TILE_SIZE, cp.y * TILE_SIZE, cp.activated, cp.glowTime);
    }

    this.drawPushBox(level.pushBox.x, level.pushBox.y, level.pushBox.width, level.pushBox.height);

    this.drawGoal(level.goal.x * TILE_SIZE, level.goal.y * TILE_SIZE, level.goal.rotation);
  }

  drawSpike(x: number, y: number) {
    const ctx = this.ctx;
    const pulse = 0.95 + 0.05 * Math.sin(this.spikePulseTime * Math.PI * 4);
    const baseY = y + TILE_SIZE;

    const centerX = x + TILE_SIZE / 2;
    const spikeWidth = TILE_SIZE * 0.8 * pulse;
    const spikeHeight = TILE_SIZE * 0.7 * pulse;

    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(centerX - spikeWidth / 2, baseY);
    ctx.lineTo(centerX, baseY - spikeHeight);
    ctx.lineTo(centerX + spikeWidth / 2, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(centerX - spikeWidth / 4, baseY);
    ctx.lineTo(centerX - spikeWidth / 8, baseY - spikeHeight * 0.5);
    ctx.lineTo(centerX, baseY - spikeHeight);
    ctx.lineTo(centerX - spikeWidth / 6, baseY - spikeHeight * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  drawCheckpoint(x: number, y: number, activated: boolean, glowTime: number) {
    const ctx = this.ctx;
    const size = TILE_SIZE * 0.9;
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;

    if (glowTime > 0 || activated) {
      const glowRadius = size * (activated ? 1.2 : 1 + (1 - glowTime / 0.5) * 0.5);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);
    }

    ctx.fillStyle = activated ? 'rgba(255, 215, 0, 0.7)' : 'rgba(100, 150, 255, 0.5)';
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);

    ctx.strokeStyle = activated ? 'rgba(255, 215, 0, 1)' : 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
  }

  drawPushBox(x: number, y: number, w: number, h: number) {
    const ctx = this.ctx;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, w, h);

    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = '#5a2d0a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.strokeStyle = '#5a2d0a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
  }

  drawGoal(x: number, y: number, rotation: number) {
    const ctx = this.ctx;
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    const outerR = TILE_SIZE * 0.4;
    const innerR = TILE_SIZE * 0.18;

    const pulse = 1 + 0.1 * Math.sin(this.spikePulseTime * Math.PI * 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(pulse, pulse);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerR * 1.5);
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(-outerR * 1.5, -outerR * 1.5, outerR * 3, outerR * 3);

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-outerR * 0.2, -outerR * 0.2, outerR * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawPlayer(player: Player) {
    const ctx = this.ctx;
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;

    ctx.fillStyle = player.color;
    ctx.fillRect(x, y, w, h);

    const highlightGradient = ctx.createLinearGradient(x, y, x + w * 0.6, y + h * 0.6);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(0, 200, 180, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  drawParticles(player: Player) {
    const ctx = this.ctx;

    for (const p of player.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawWinParticles(game: Game) {
    const ctx = this.ctx;

    for (const p of game.winParticles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(game: Game) {
    const ctx = this.ctx;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Lives: ${game.lives}`, 20, 35);

    ctx.fillText('Level 1', 20, 60);

    if (game.state === 'rewind' || game.state === 'playing') {
      this.drawRewindIndicator(game);
    }

    this.drawControlsHint();
  }

  drawRewindIndicator(game: Game) {
    const ctx = this.ctx;
    const cx = this.canvas.width - 50;
    const cy = 50;
    const radius = 30;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    const progress = game.rewindProgress;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, endAngle, startAngle, true);
    ctx.stroke();

    ctx.fillStyle = game.state === 'rewind' ? '#00ffff' : 'rgba(0, 255, 255, 0.5)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REW', cx, cy + 4);
  }

  drawControlsHint() {
    const ctx = this.ctx;
    const alpha = this.mouseHoveringHint ? 1 : 0.3;

    ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'WASD/Arrows: Move | Space: Jump | Shift: Slow | Tab: Rewind | Q/W/E: Rewind 0.5s/2s/5s',
      this.canvas.width / 2,
      this.canvas.height - 20
    );
  }

  drawMenu(game: Game) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TIME REWIND', this.canvas.width / 2, this.canvas.height / 2 - 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('PLATFORMER', this.canvas.width / 2, this.canvas.height / 2 - 10);

    const pulse = 0.7 + 0.3 * Math.sin(this.spikePulseTime * Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.font = '20px monospace';
    ctx.fillText('Press SPACE to Start', this.canvas.width / 2, this.canvas.height / 2 + 60);

    ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
    ctx.font = '14px monospace';
    ctx.fillText('Use time rewind to solve puzzles', this.canvas.width / 2, this.canvas.height / 2 + 100);
  }

  drawGameOver(game: Game) {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);

    const progress = Math.min(1, game.gameOverTextTime / 2);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.canvas.width / 2, this.canvas.height / 2 + 60, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }

  drawWinScreen(game: Game) {
    const ctx = this.ctx;

    const textProgress = Math.min(1, game.winTextTime / 0.5);
    const bounceOffset = -100 + 100 * textProgress + Math.sin(textProgress * Math.PI) * 20;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'YOU WIN!',
      this.canvas.width / 2,
      this.canvas.height / 2 + bounceOffset
    );

    if (game.winTextTime > 1) {
      const fadeOut = Math.min(1, (game.winTextTime - 1) / 1);
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - fadeOut})`;
      ctx.font = '20px monospace';
      ctx.fillText(
        'Returning to menu...',
        this.canvas.width / 2,
        this.canvas.height / 2 + 50
      );
    }
  }
}
