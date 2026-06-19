import type { PlayerStateData } from './Player';
import type {
  Obstacle,
  Coin,
  ScorePopup,
  Particle,
  WarningCircle
} from './ObstacleManager';

export interface GameState {
  width: number;
  height: number;
  groundY: number;
  score: number;
  combo: number;
  bestScore: number;
  isGameOver: boolean;
  isStarted: boolean;
  speed: number;
  beatProgress: number;
  beatPulseTime: number;
  bestScoreTypewriter: string;
  bestScoreTypewriterProgress: number;
  volume: number;
  volumeHover: boolean;
  lowQuality: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dashOffset = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  public resize(w: number, h: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public render(
    state: GameState,
    player: PlayerStateData,
    obstacles: Obstacle[],
    coins: Coin[],
    scorePopups: ScorePopup[],
    particles: Particle[],
    warningCircles: WarningCircle[],
    now: number
  ): void {
    const ctx = this.ctx;
    const { width, height, groundY, beatPulseTime } = state;

    this.drawBackground(width, height);

    const pulseT = Math.min(1, (now - beatPulseTime) / 0.2);
    if (pulseT < 1) {
      this.drawPulseGlow(width, height, pulseT, state.lowQuality);
    }

    this.drawTrack(width, height, groundY, state.speed, state.lowQuality);
    this.drawWarningCircles(warningCircles, now);
    this.drawObstacles(obstacles);
    this.drawCoins(coins, now, state.lowQuality);
    this.drawPlayer(player);
    this.drawParticles(particles, state.lowQuality);
    this.drawScorePopups(scorePopups, now);
    this.drawUI(state, now);

    if (!state.isStarted) {
      this.drawStartScreen(width, height);
    }
    if (state.isGameOver) {
      this.drawGameOverScreen(state, width, height, now);
    }

    this.drawVolumeControl(state, width, height);
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
    grad.addColorStop(0, '#1a1a4e');
    grad.addColorStop(0.6, '#181845');
    grad.addColorStop(1, '#2d0a4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawPulseGlow(w: number, h: number, t: number, lowQuality: boolean): void {
    const ctx = this.ctx;
    const alpha = (1 - t) * 0.4;
    const thickness = (lowQuality ? 30 : 40) + t * (lowQuality ? 60 : 80);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 220, 120, ${alpha})`;
    ctx.lineWidth = thickness;
    if (lowQuality) {
      ctx.strokeRect(0, 0, w, h);
    } else {
      ctx.strokeRect(thickness / 2, thickness / 2, w - thickness, h - thickness);
    }
    ctx.restore();
  }

  private drawTrack(w: number, h: number, groundY: number, speed: number, _lowQuality: boolean): void {
    const ctx = this.ctx;
    this.dashOffset = (this.dashOffset + speed * 0.016) % 60;

    const laneLeft = w * 0.15;
    const laneRight = w * 0.85;

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -this.dashOffset;

    ctx.beginPath();
    ctx.moveTo(laneLeft, groundY - 50);
    ctx.lineTo(w + 50, groundY - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(laneRight, groundY - 50);
    ctx.lineTo(w + 50, groundY - 10);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, groundY, w, h - groundY);
  }

  private drawWarningCircles(circles: WarningCircle[], now: number): void {
    const ctx = this.ctx;
    for (const c of circles) {
      const t = Math.min(1, (now - c.spawnTime) / c.duration);
      const r = t * 1.5 * 30;
      const alpha = 1 - t;
      ctx.save();
      ctx.strokeStyle = c.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    const ctx = this.ctx;
    for (const o of obstacles) {
      if (!o.active) continue;
      ctx.save();
      switch (o.type) {
        case 'spike':
          ctx.fillStyle = '#ff3344';
          ctx.strokeStyle = '#ff6677';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(o.x, o.y + o.height);
          ctx.lineTo(o.x + o.width / 2, o.y);
          ctx.lineTo(o.x + o.width, o.y + o.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'wall':
          ctx.fillStyle = '#888899';
          ctx.strokeStyle = '#aaaabb';
          ctx.lineWidth = 2;
          ctx.fillRect(o.x, o.y, o.width, o.height);
          ctx.strokeRect(o.x, o.y, o.width, o.height);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(o.x + 5, o.y + 5, o.width - 10, 6);
          ctx.fillRect(o.x + 5, o.y + 20, o.width - 10, 6);
          ctx.fillRect(o.x + 5, o.y + 35, o.width - 10, 6);
          break;
        case 'bar':
          ctx.fillStyle = '#3388ff';
          ctx.strokeStyle = '#66aaff';
          ctx.lineWidth = 2;
          ctx.fillRect(o.x, o.y, o.width, o.height);
          ctx.strokeRect(o.x, o.y, o.width, o.height);
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(o.x + 4, o.y + 4, o.width - 8, 4);
          break;
      }
      ctx.restore();
    }
  }

  private drawCoins(coins: Coin[], now: number, lowQuality: boolean): void {
    const ctx = this.ctx;
    for (const c of coins) {
      if (c.collected) continue;
      ctx.save();
      const age = now - c.spawnTime;

      if (c.type === 'beat') {
        const blink = Math.sin(now * 20) * 0.3 + 0.7;
        ctx.globalAlpha = blink;
        if (!lowQuality) {
          const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius * 2.5);
          glow.addColorStop(0, 'rgba(170, 85, 255, 0.6)');
          glow.addColorStop(1, 'rgba(170, 85, 255, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(c.x - c.radius * 2.5, c.y - c.radius * 2.5, c.radius * 5, c.radius * 5);
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#aa55ff';
        ctx.strokeStyle = '#dd99ff';
        ctx.lineWidth = 2;
        this.drawStar(c.x, c.y, 5, c.radius, c.radius * 0.45);
        ctx.fill();
        ctx.stroke();
      } else {
        const rot = age * 4;
        const scaleX = Math.abs(Math.cos(rot));
        ctx.translate(c.x, c.y);
        ctx.scale(scaleX, 1);
        if (!lowQuality) {
          const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, c.radius * 2);
          glow.addColorStop(0, 'rgba(255, 220, 0, 0.5)');
          glow.addColorStop(1, 'rgba(255, 220, 0, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(-c.radius * 2, -c.radius * 2, c.radius * 4, c.radius * 4);
        }

        ctx.fillStyle = '#ffdd00';
        ctx.strokeStyle = '#ffee66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (!lowQuality) {
          ctx.fillStyle = '#ffee88';
          ctx.beginPath();
          ctx.arc(-c.radius * 0.3, -c.radius * 0.3, c.radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerR: number, innerR: number): void {
    const ctx = this.ctx;
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    }
    ctx.closePath();
  }

  private drawPlayer(p: PlayerStateData): void {
    const ctx = this.ctx;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (p.state === 'jumping') {
      ctx.rotate(p.rotation);
    }

    const w = p.width;
    const h = p.height;

    ctx.fillStyle = '#ff3344';
    ctx.strokeStyle = '#ff6677';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    if (p.state !== 'sliding') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w / 2 + 8, -h / 2 + 10, 8, 8);
      ctx.fillRect(w / 2 - 16, -h / 2 + 10, 8, 8);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-w / 2 + 11, -h / 2 + 13, 3, 3);
      ctx.fillRect(w / 2 - 13, -h / 2 + 13, 3, 3);
    }

    if (p.state === 'running') {
      ctx.fillStyle = '#cc2233';
      const legOffset = (p.runFrame % 2 === 0) ? 1 : -1;
      ctx.fillRect(-w / 2 + 6, h / 2 - 2, 10, 6 + legOffset * 3);
      ctx.fillRect(w / 2 - 16, h / 2 - 2, 10, 6 - legOffset * 3);
    }

    ctx.restore();

    if (p.slideTrailActive) {
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const alpha = 0.3 * (1 - i / 4);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        const px = p.x - i * 8;
        const py = p.y + p.height - 4;
        ctx.beginPath();
        ctx.arc(px + 5, py, 4 - i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawParticles(particles: Particle[], lowQuality: boolean): void {
    const ctx = this.ctx;
    for (let i = 0; i < particles.length; i++) {
      if (lowQuality && i % 2 === 1) continue;
      const p = particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawScorePopups(popups: ScorePopup[], now: number): void {
    const ctx = this.ctx;
    for (const pop of popups) {
      const t = Math.min(1, (now - pop.spawnTime) / 0.5);
      const alpha = 1 - t;
      const color = pop.value >= 50 ? '#cc88ff' : '#ffee66';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${pop.value >= 50 ? 28 : 22}px Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      const text = `+${pop.value}`;
      ctx.strokeText(text, pop.x, pop.y);
      ctx.fillText(text, pop.x, pop.y);
      ctx.restore();
    }
  }

  private drawUI(state: GameState, _now: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const hasComboBoost = state.combo > 5;
    let scoreColor = '#ffffff';
    let scoreScale = 1;
    let glowColor = 'rgba(255, 215, 0, 0.5)';
    let glowBlur = 8;

    if (hasComboBoost) {
      scoreColor = '#ffaa33';
      const pulse = Math.sin(_now * 8) * 0.15 + 1.1;
      scoreScale = pulse;
      glowColor = 'rgba(255, 150, 50, 0.7)';
      glowBlur = 15;
    }

    ctx.save();
    ctx.translate(30, 30);
    ctx.scale(scoreScale, scoreScale);
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillStyle = scoreColor;
    ctx.fillText(`${state.score}`, 0, 0);
    ctx.restore();

    if (state.combo > 0) {
      ctx.save();
      const comboScale = hasComboBoost ? Math.sin(_now * 8) * 0.1 + 1.05 : 1;
      ctx.translate(30, 80);
      ctx.scale(comboScale, comboScale);
      ctx.font = hasComboBoost ? 'bold 26px Arial, sans-serif' : 'bold 22px Arial, sans-serif';
      ctx.fillStyle = hasComboBoost ? '#ff9933' : '#aaccff';
      ctx.shadowColor = hasComboBoost ? 'rgba(255, 150, 50, 0.6)' : 'rgba(100, 150, 255, 0.5)';
      ctx.shadowBlur = hasComboBoost ? 10 : 6;
      ctx.fillText(`COMBO x${state.combo}`, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawStartScreen(w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.fillStyle = '#ff5566';
    ctx.shadowColor = 'rgba(255,100,100,0.7)';
    ctx.shadowBlur = 20;
    ctx.fillText('RHYTHM RUNNER', w / 2, h / 2 - 80);

    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillText('空格键 跳跃   |   ↓ 键 滑铲', w / 2, h / 2);

    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillStyle = '#ffee66';
    ctx.fillText('点击屏幕或按空格键开始', w / 2, h / 2 + 60);
    ctx.restore();
  }

  private drawGameOverScreen(state: GameState, w: number, h: number, _now: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Arial, sans-serif';
    ctx.fillStyle = '#ff5566';
    ctx.shadowColor = 'rgba(255,100,100,0.7)';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', w / 2, h / 2 - 100);

    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillText(`本局得分: ${state.score}`, w / 2, h / 2 - 20);

    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillStyle = '#ffcc44';
    ctx.fillText(`最高纪录: ${state.bestScoreTypewriter}`, w / 2, h / 2 + 40);

    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#aaccff';
    ctx.fillText('点击屏幕或按空格键重新开始', w / 2, h / 2 + 110);
    ctx.restore();
  }

  private drawVolumeControl(state: GameState, w: number, h: number): void {
    const ctx = this.ctx;
    const padding = 20;
    const sliderW = 120;
    const sliderH = 6;
    const x = w - padding - sliderW;
    const y = h - padding - 20;

    ctx.save();
    const scale = state.volumeHover ? 1.1 : 1.0;
    const alpha = state.volumeHover ? 1.0 : 0.5;
    ctx.translate(x + sliderW / 2, y + sliderH / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(40,40,80,0.8)';
    ctx.fillRect(-sliderW / 2 - 6, -sliderH / 2 - 8, sliderW + 12, sliderH + 16);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-sliderW / 2, -sliderH / 2, sliderW, sliderH);

    ctx.fillStyle = '#66aaff';
    ctx.fillRect(-sliderW / 2, -sliderH / 2, sliderW * state.volume, sliderH);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-sliderW / 2 + sliderW * state.volume, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', -sliderW / 2 - 18, 0);

    ctx.restore();
  }

  public getVolumeSliderBounds(w: number, h: number): { x: number; y: number; w: number; h: number } {
    const padding = 20;
    const sliderW = 120;
    const sliderH = 6;
    return {
      x: w - padding - sliderW - 10,
      y: h - padding - 20 - sliderH / 2 - 10,
      w: sliderW + 20,
      h: sliderH + 20
    };
  }
}
