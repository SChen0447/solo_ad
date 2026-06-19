import { Player, PlayerState } from './Player';
import { ObstacleManager, GameObject, ScorePopup } from './ObstacleManager';
import { BeatSync } from './BeatSync';

interface PulseState {
  startTime: number;
  duration: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dashOffset = 0;
  private pulses: PulseState[] = [];
  private particles: Particle[] = [];
  private maxParticles = 50;
  private useHalfRes = false;
  private comboPulsePhase = 0;
  private gameOverAlpha = 0;
  private typewriterText = '';
  private typewriterTarget = '';
  private typewriterIndex = 0;
  private typewriterTimer = 0;
  private volumeHover = false;
  private volumeSliderX = 0;
  private volumeSliderY = 0;
  private volumeSliderWidth = 120;
  private volumeSliderHeight = 8;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(canvas: HTMLCanvasElement): void {
    this.width = canvas.width;
    this.height = canvas.height;
  }

  triggerPulse(currentTime: number): void {
    this.pulses.push({ startTime: currentTime, duration: 0.2 });
  }

  addParticle(x: number, y: number, color: string, count: number): void {
    const limit = this.useHalfRes ? Math.floor(count / 2) : count;
    for (let i = 0; i < limit; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 80 + 30;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.5 + Math.random() * 0.3,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  setPerformanceMode(halfRes: boolean): void {
    this.useHalfRes = halfRes;
    this.maxParticles = halfRes ? 25 : 50;
  }

  updateParticles(dt: number): void {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  render(
    currentTime: number,
    dt: number,
    player: Player,
    obstacleManager: ObstacleManager,
    beatSync: BeatSync,
    score: number,
    combo: number,
    highScore: number,
    isGameOver: boolean,
    volume: number
  ): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx);
    this.drawPulses(ctx, currentTime);
    this.drawTrack(ctx, dt, obstacleManager);
    this.drawWarnings(ctx, currentTime, obstacleManager);
    this.drawObjects(ctx, currentTime, obstacleManager);
    this.drawPlayer(ctx, currentTime, player);
    this.drawParticles(ctx, dt);
    this.drawScorePopups(ctx, currentTime, obstacleManager);
    this.drawHUD(ctx, score, combo, currentTime);
    this.drawVolumeSlider(ctx, volume);

    if (isGameOver) {
      this.drawGameOver(ctx, score, highScore, currentTime, dt);
    }

    this.pulses = this.pulses.filter((p) => currentTime - p.startTime < p.duration);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      this.width * 0.7
    );
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#4a0e8f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawPulses(ctx: CanvasRenderingContext2D, currentTime: number): void {
    for (const pulse of this.pulses) {
      const elapsed = currentTime - pulse.startTime;
      const progress = elapsed / pulse.duration;
      if (progress > 1) continue;
      const alpha = 0.4 * (1 - progress);
      const size = this.width * (0.5 + progress * 0.3);
      ctx.save();
      ctx.strokeStyle = `rgba(138, 43, 226, ${alpha})`;
      ctx.lineWidth = 3 + progress * 5;
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTrack(ctx: CanvasRenderingContext2D, dt: number, om: ObstacleManager): void {
    const groundY = this.height * 0.75;
    const trackTop = groundY - this.height * 0.25;
    const trackBottom = groundY;
    this.dashOffset -= 300 * dt;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    ctx.lineDashOffset = this.dashOffset;

    ctx.beginPath();
    ctx.moveTo(0, trackTop);
    ctx.lineTo(this.width, trackTop);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, trackBottom);
    ctx.lineTo(this.width, trackBottom);
    ctx.stroke();

    ctx.setLineDash([]);

    for (let x = (this.dashOffset % 40) - 40; x < this.width; x += 40) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x, trackTop, 2, trackBottom - trackTop);
    }

    ctx.restore();
  }

  private drawWarnings(ctx: CanvasRenderingContext2D, currentTime: number, om: ObstacleManager): void {
    const objects = om.getObjects();
    for (const obj of objects) {
      if (obj.isActive) continue;
      const timeSinceWarning = currentTime - obj.warningStartTime;
      if (timeSinceWarning < 0) continue;
      const warningDuration = 0.3;
      const progress = Math.min(timeSinceWarning / warningDuration, 1);
      const radius = progress * this.width * 0.015 * 1.5;
      const alpha = 0.7 * (1 - progress * 0.5);

      ctx.save();
      ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawObjects(ctx: CanvasRenderingContext2D, currentTime: number, om: ObstacleManager): void {
    const objects = om.getObjects();
    for (const obj of objects) {
      if (!obj.isActive || obj.collected) continue;

      ctx.save();
      switch (obj.type) {
        case 'spike':
          this.drawSpike(ctx, obj);
          break;
        case 'lowWall':
          this.drawLowWall(ctx, obj);
          break;
        case 'highBar':
          this.drawHighBar(ctx, obj);
          break;
        case 'normal':
          this.drawNormalCoin(ctx, obj, currentTime);
          break;
        case 'beat':
          this.drawBeatCoin(ctx, obj, currentTime, om);
          break;
      }
      ctx.restore();
    }
  }

  private drawSpike(ctx: CanvasRenderingContext2D, obj: GameObject): void {
    ctx.fillStyle = '#ff3333';
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(obj.x, obj.y + obj.height);
    ctx.lineTo(obj.x + obj.width / 2, obj.y);
    ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawLowWall(ctx: CanvasRenderingContext2D, obj: GameObject): void {
    ctx.fillStyle = '#888888';
    ctx.shadowColor = '#666666';
    ctx.shadowBlur = 4;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.shadowBlur = 0;
  }

  private drawHighBar(ctx: CanvasRenderingContext2D, obj: GameObject): void {
    ctx.fillStyle = '#4488ff';
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 6;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    ctx.fillStyle = '#6699ff';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height * 0.3);
    ctx.shadowBlur = 0;

    const groundY = this.height * 0.75;
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(obj.x + 2, obj.y + obj.height, 4, groundY - obj.y - obj.height);
    ctx.fillRect(obj.x + obj.width - 6, obj.y + obj.height, 4, groundY - obj.y - obj.height);
  }

  private drawNormalCoin(ctx: CanvasRenderingContext2D, obj: GameObject, currentTime: number): void {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const scaleX = Math.cos(obj.rotation);
    const r = obj.width / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, 1);
    ctx.fillStyle = '#ffdd00';
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 10 + Math.sin(currentTime * 6) * 5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawBeatCoin(ctx: CanvasRenderingContext2D, obj: GameObject, currentTime: number, om: ObstacleManager): void {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const r = obj.width / 2;
    const flash = 0.5 + Math.sin(currentTime * 12) * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(obj.rotation);
    ctx.fillStyle = `rgba(180, 60, 255, ${0.6 + flash * 0.4})`;
    ctx.shadowColor = '#b43cff';
    ctx.shadowBlur = 15 + flash * 10;
    this.drawStar(ctx, 0, 0, r * 0.5, r, 5);
    ctx.fill();
    ctx.strokeStyle = '#d88fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    if (Math.random() < 0.3) {
      om as any;
      this.addParticle(cx, cy, '#b43cff', 1);
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, innerR: number, outerR: number, points: number): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, currentTime: number, player: Player): void {
    const state = player.getState();
    ctx.save();

    const cx = state.x + state.width / 2;
    const cy = state.y + state.height / 2;

    if (state.isJumping) {
      ctx.translate(cx, cy);
      ctx.rotate(state.rotation);
      ctx.translate(-state.width / 2, -state.height / 2);
    } else {
      ctx.translate(state.x, state.y);
    }

    if (state.isSliding) {
      ctx.translate(state.width / 2, state.height);
      ctx.translate(-state.width / 2, -state.height);
    }

    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 6;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    const eyeSize = state.width * 0.12;
    ctx.fillRect(state.width * 0.25, state.height * 0.2, eyeSize, eyeSize);
    ctx.fillRect(state.width * 0.6, state.height * 0.2, eyeSize, eyeSize);

    if (!state.isJumping && !state.isSliding) {
      const legOffset = Math.sin(state.legPhase) * state.height * 0.15;
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(state.width * 0.15, state.height, state.width * 0.2, state.height * 0.25 + legOffset);
      ctx.fillRect(state.width * 0.6, state.height, state.width * 0.2, state.height * 0.25 - legOffset);
    } else if (state.isSliding) {
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(state.width * 0.1, state.height * 0.8, state.width * 0.3, state.height * 0.15);
      ctx.fillRect(state.width * 0.6, state.height * 0.8, state.width * 0.3, state.height * 0.15);
    }

    ctx.restore();

    if (state.isSliding) {
      for (const p of state.slideParticles) {
        const alpha = p.life / 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    this.updateParticles(dt);
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      if (p.color.startsWith('#')) {
        const r = parseInt(p.color.slice(1, 3), 16);
        const g = parseInt(p.color.slice(3, 5), 16);
        const b = parseInt(p.color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawScorePopups(ctx: CanvasRenderingContext2D, currentTime: number, om: ObstacleManager): void {
    const popups = om.getScorePopups();
    for (const popup of popups) {
      const elapsed = currentTime - popup.startTime;
      const progress = elapsed / popup.duration;
      if (progress > 1) continue;
      const alpha = 1 - progress;
      const yOffset = progress * 40;
      ctx.save();
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = popup.value >= 50 ? `rgba(180, 60, 255, ${alpha})` : `rgba(255, 221, 0, ${alpha})`;
      ctx.fillText(`+${popup.value}`, popup.x, popup.y - yOffset);
      ctx.restore();
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D, score: number, combo: number, currentTime: number): void {
    ctx.save();
    const isHighCombo = combo > 5;
    const scale = isHighCombo ? 1 + Math.sin(currentTime * 8) * 0.05 : 1;
    const color = isHighCombo ? '#ff8800' : '#ffffff';
    const shadowColor = isHighCombo ? 'rgba(255, 136, 0, 0.5)' : 'rgba(255, 215, 0, 0.3)';

    ctx.font = `bold ${Math.round(36 * scale)}px monospace`;
    ctx.textAlign = 'left';
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.fillText(`${score}`, 30, 50);
    ctx.shadowBlur = 0;

    if (combo > 1) {
      const comboScale = isHighCombo ? 1 + Math.sin(currentTime * 10) * 0.08 : 1;
      ctx.font = `bold ${Math.round(20 * comboScale)}px monospace`;
      ctx.fillStyle = isHighCombo ? '#ff8800' : '#aaaaff';
      ctx.fillText(`x${combo} COMBO`, 30, 80);
    }

    ctx.restore();
  }

  private drawVolumeSlider(ctx: CanvasRenderingContext2D, volume: number): void {
    const padding = 20;
    const sliderX = this.width - this.volumeSliderWidth - padding;
    const sliderY = this.height - padding - this.volumeSliderHeight;

    this.volumeSliderX = sliderX;
    this.volumeSliderY = sliderY;

    const alpha = this.volumeHover ? 1 : 0.4;
    const scale = this.volumeHover ? 1.1 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(sliderX + this.volumeSliderWidth / 2, sliderY + this.volumeSliderHeight / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(this.volumeSliderWidth / 2), -(this.volumeSliderHeight / 2));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, this.volumeSliderWidth, this.volumeSliderHeight);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, this.volumeSliderWidth * volume, this.volumeSliderHeight);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('VOL', this.volumeSliderWidth / 2, -6);

    ctx.restore();
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, score: number, highScore: number, currentTime: number, dt: number): void {
    this.gameOverAlpha = Math.min(this.gameOverAlpha + dt * 2, 1);

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${this.gameOverAlpha * 0.7})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalAlpha = this.gameOverAlpha;
    ctx.textAlign = 'center';

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 60);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${score}`, this.width / 2, this.height / 2);

    this.typewriterTarget = `BEST: ${highScore}`;
    this.typewriterTimer += dt;
    if (this.typewriterTimer > 0.05 && this.typewriterIndex < this.typewriterTarget.length) {
      this.typewriterIndex++;
      this.typewriterTimer = 0;
    }
    this.typewriterText = this.typewriterTarget.substring(0, this.typewriterIndex);

    ctx.font = '24px monospace';
    ctx.fillStyle = '#ffdd00';
    ctx.fillText(this.typewriterText, this.width / 2, this.height / 2 + 40);

    ctx.font = '18px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('PRESS SPACE TO RESTART', this.width / 2, this.height / 2 + 100);

    ctx.restore();
  }

  resetGameOver(): void {
    this.gameOverAlpha = 0;
    this.typewriterText = '';
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
  }

  setVolumeHover(hover: boolean): void {
    this.volumeHover = hover;
  }

  getVolumeSliderBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.volumeSliderX,
      y: this.volumeSliderY,
      width: this.volumeSliderWidth,
      height: this.volumeSliderHeight,
    };
  }
}
