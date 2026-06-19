import { EngineFrameState, Player, CrashParticle } from './GameEngine';
import { Obstacle } from './ObstacleGenerator';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private time: number = 0;
  private gradeAnimStart: number = 0;
  private lastGameState: string = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.resize();
    this.initStars();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.7,
        size: 0.5 + Math.random() * 2,
        baseAlpha: 0.2 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
  }

  render(state: EngineFrameState, dt: number): void {
    this.time += dt;
    if (state.gameState !== this.lastGameState) {
      if (state.gameState === 'ended' && state.result) {
        this.gradeAnimStart = this.time;
      }
      this.lastGameState = state.gameState;
    }
    const shakeX = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake * 20 : 0;
    const shakeY = state.screenShake > 0 ? (Math.random() - 0.5) * state.screenShake * 20 : 0;
    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);
    this.clear();
    this.drawBackground(state);
    this.drawGround(state);
    this.drawObstacles(state);
    this.drawPlayer(state.player);
    this.drawCrashParticles(state.crashParticles);
    this.drawCombo(state);
    this.drawFlashes(state);
    if (state.gameState === 'ended' && state.result) {
      this.drawGrade(state);
    }
    this.ctx.restore();
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawBackground(state: EngineFrameState): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0e2a');
    gradient.addColorStop(0.6, '#05071a');
    gradient.addColorStop(1, '#02030a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    for (const star of this.stars) {
      const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(this.time * star.speed + star.phase));
      const beatBoost = state.flash * 0.8;
      this.ctx.fillStyle = `rgba(200, 220, 255, ${Math.min(1, alpha + beatBoost)})`;
      this.ctx.fillRect(star.x * this.width, star.y * this.height, star.size, star.size);
    }
  }

  private worldToScreenX(x: number): number {
    const horizonX = this.width * 0.5;
    const nearX = this.width * 0.35;
    const t = Math.max(0, Math.min(1, (x + 5) / 12));
    return nearX + (horizonX - nearX) * (1 - t);
  }

  private worldToScreenY(y: number, x: number): number {
    const groundY = this.height * 0.78;
    const horizonY = this.height * 0.55;
    const t = Math.max(0, Math.min(1, (x + 5) / 12));
    const scale = 0.3 + 0.7 * t;
    const baseY = groundY - (groundY - horizonY) * (1 - t);
    return baseY - y * 100 * scale;
  }

  private getScale(x: number): number {
    const t = Math.max(0, Math.min(1, (x + 5) / 12));
    return 0.3 + 0.7 * t;
  }

  private drawGround(state: EngineFrameState): void {
    const horizonY = this.height * 0.55;
    const groundY = this.height * 0.78;
    const gradient = this.ctx.createLinearGradient(0, horizonY, 0, groundY + 50);
    gradient.addColorStop(0, 'rgba(30, 60, 120, 0.15)');
    gradient.addColorStop(1, 'rgba(50, 100, 180, 0.08)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizonY);
    this.ctx.lineTo(this.width, horizonY);
    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.strokeStyle = `rgba(100, 150, 220, ${0.25 + state.flash * 0.5})`;
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      const t = i / 15;
      const y = horizonY + (groundY - horizonY) * Math.pow(t, 1.5);
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    const scroll = (this.time * 0.8) % 1;
    const horizonX = this.width * 0.5;
    for (let i = -10; i < 10; i++) {
      const offset = (i + scroll) * 0.5;
      const leftX = horizonX + offset * 80 - 200;
      const rightX = horizonX + offset * 80 + 200;
      this.ctx.strokeStyle = `rgba(80, 140, 210, ${0.15 + state.flash * 0.3})`;
      this.ctx.beginPath();
      this.ctx.moveTo(leftX, groundY);
      this.ctx.lineTo(horizonX + offset * 10, horizonY);
      this.ctx.lineTo(rightX, groundY);
      this.ctx.stroke();
    }
  }

  private drawObstacles(state: EngineFrameState): void {
    for (const obs of state.obstacles) {
      const obsX = 3 - (state.currentTime - obs.position) * 8;
      if (obsX < -3 || obsX > 8) continue;
      this.drawObstacle(obs, obsX, state);
    }
  }

  private drawObstacle(obs: Obstacle, x: number, state: EngineFrameState): void {
    const scale = this.getScale(x);
    if (obs.type === 'low') {
      const w = 0.6 * 100 * scale;
      const h = 0.6 * 100 * scale;
      const screenX = this.worldToScreenX(x) - w / 2;
      const screenY = this.worldToScreenY(0, x) - h;
      const alpha = obs.hit ? 0.3 : 0.75;
      const gradient = this.ctx.createLinearGradient(screenX, screenY, screenX, screenY + h);
      gradient.addColorStop(0, `rgba(255, 160, 60, ${alpha + state.flash * 0.2})`);
      gradient.addColorStop(1, `rgba(255, 90, 40, ${alpha})`);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(screenX, screenY, w, h);
      this.ctx.strokeStyle = `rgba(255, 200, 100, ${alpha + state.flash * 0.3})`;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(screenX, screenY, w, h);
    } else {
      const w = 0.8 * 100 * scale;
      const h = 0.5 * 100 * scale;
      const baseY = 1.2;
      const screenX = this.worldToScreenX(x) - w / 2;
      const screenY = this.worldToScreenY(baseY, x) - h / 2;
      const alpha = obs.hit ? 0.3 : 0.75;
      const gradient = this.ctx.createLinearGradient(screenX, screenY, screenX, screenY + h);
      gradient.addColorStop(0, `rgba(180, 100, 255, ${alpha + state.flash * 0.2})`);
      gradient.addColorStop(1, `rgba(120, 50, 200, ${alpha})`);
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(screenX, screenY, w, h);
      this.ctx.strokeStyle = `rgba(200, 150, 255, ${alpha + state.flash * 0.3})`;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(screenX, screenY, w, h);
    }
  }

  private drawPlayer(player: Player): void {
    const x = 3;
    const scale = this.getScale(x);
    const baseW = 0.6 * 100 * scale;
    const baseH = 1.0 * 100 * scale;
    const w = baseW * player.scaleX;
    const h = baseH * player.scaleY;
    const screenX = this.worldToScreenX(x) - w / 2;
    const screenY = this.worldToScreenY(player.y, x) - h;
    this.ctx.save();
    const centerX = screenX + w / 2;
    const centerY = screenY + h / 2;
    this.ctx.translate(centerX, centerY);
    const glow = player.state !== 'running' ? 15 : 6;
    this.ctx.shadowColor = '#44aaff';
    this.ctx.shadowBlur = glow;
    const bodyGrad = this.ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    bodyGrad.addColorStop(0, '#66ccff');
    bodyGrad.addColorStop(1, '#2266cc');
    this.ctx.fillStyle = bodyGrad;
    this.ctx.fillRect(-w / 2, -h / 2 + h * 0.25, w, h * 0.6);
    this.ctx.shadowBlur = glow * 0.8;
    this.ctx.shadowColor = '#88ddff';
    const headR = Math.min(w * 0.35, h * 0.22);
    this.ctx.fillStyle = '#88ddff';
    this.ctx.beginPath();
    this.ctx.arc(0, -h / 2 + h * 0.18, headR, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#0a0e2a';
    this.ctx.beginPath();
    this.ctx.arc(-headR * 0.35, -h / 2 + h * 0.17, headR * 0.2, 0, Math.PI * 2);
    this.ctx.arc(headR * 0.35, -h / 2 + h * 0.17, headR * 0.2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#1a3a6a';
    const legW = w * 0.22;
    const legH = h * 0.2;
    const legOffset = Math.sin(this.time * 10) * w * 0.08;
    if (player.state === 'running') {
      this.ctx.fillRect(-w / 2 + w * 0.15 - legOffset, h * 0.25, legW, legH);
      this.ctx.fillRect(w / 2 - w * 0.15 - legW + legOffset, h * 0.25, legW, legH);
    } else {
      this.ctx.fillRect(-w / 2 + w * 0.15, h * 0.25, legW, legH * 0.6);
      this.ctx.fillRect(w / 2 - w * 0.15 - legW, h * 0.25, legW, legH * 0.6);
    }
    this.ctx.restore();
  }

  private drawCrashParticles(particles: CrashParticle[]): void {
    for (const p of particles) {
      const alpha = 1 - p.life / p.maxLife;
      const size = p.size * alpha;
      const scale = this.getScale(3);
      const screenX = this.worldToScreenX(3) + p.x * 30 * scale;
      const screenY = this.worldToScreenY(0.5, 3) - p.y * 30 * scale;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
      this.ctx.globalAlpha = 1;
    }
  }

  private drawCombo(state: EngineFrameState): void {
    if (state.score.combo <= 1) return;
    const x = this.width * 0.85;
    const y = this.height * 0.35;
    const pulse = state.comboPulse > 0 ? 1 + state.comboPulse * 1.5 : 1;
    const size = Math.min(60 + state.score.combo * 1.5, 100) * pulse;
    this.ctx.save();
    this.ctx.font = `bold ${size}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const t = Math.min(state.score.combo / 30, 1);
    const r = Math.floor(255);
    const g = Math.floor(255 - t * 180);
    const b = Math.floor(80 - t * 80);
    this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.9)`;
    this.ctx.shadowBlur = 20 + pulse * 20;
    const gradient = this.ctx.createLinearGradient(x, y - size / 2, x, y + size / 2);
    gradient.addColorStop(0, `rgba(255, 230, 80, 1)`);
    gradient.addColorStop(0.5, `rgba(255, 150, 40, 1)`);
    gradient.addColorStop(1, `rgba(255, 60, 30, 1)`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillText(`${state.score.combo}`, x, y);
    this.ctx.font = `bold ${size * 0.25}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.fillStyle = 'rgba(255, 200, 150, 0.9)';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('COMBO', x, y + size * 0.65);
    this.ctx.restore();
  }

  private drawFlashes(state: EngineFrameState): void {
    if (state.perfectFlash > 0) {
      this.ctx.fillStyle = `rgba(100, 220, 255, ${state.perfectFlash * 0.3})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.save();
      this.ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = `rgba(150, 240, 255, ${state.perfectFlash})`;
      this.ctx.shadowColor = '#44ccff';
      this.ctx.shadowBlur = 30;
      this.ctx.fillText('PERFECT!', this.width * 0.5, this.height * 0.35);
      this.ctx.restore();
    }
    if (state.crashFlash > 0) {
      this.ctx.fillStyle = `rgba(255, 40, 60, ${state.crashFlash * 0.5})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    if (state.flash > 0 && state.currentBeat) {
      this.ctx.strokeStyle = `rgba(120, 180, 255, ${state.flash * 0.5})`;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(2, 2, this.width - 4, this.height - 4);
    }
  }

  private drawGrade(state: EngineFrameState): void {
    if (!state.result) return;
    const elapsed = this.time - this.gradeAnimStart;
    const totalDuration = 2;
    if (elapsed > totalDuration) return;
    const x = this.width * 0.5;
    const y = this.height * 0.5;
    const t = Math.min(elapsed / 0.8, 1);
    const bounceOut = (k: number): number => {
      if (k < 1 / 2.75) return 7.5625 * k * k;
      if (k < 2 / 2.75) return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
      if (k < 2.5 / 2.75) return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
      return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
    };
    const scale = 0.2 + bounceOut(t) * 0.8;
    const alpha = elapsed < totalDuration - 0.5 ? 1 : 1 - (elapsed - (totalDuration - 0.5)) / 0.5;
    const grade = state.result.grade;
    let color: string;
    let shadowColor: string;
    switch (grade) {
      case 'S':
        color = '#ffdd44';
        shadowColor = '#ffaa00';
        break;
      case 'A':
        color = '#88ff88';
        shadowColor = '#00cc44';
        break;
      case 'B':
        color = '#66ccff';
        shadowColor = '#0088dd';
        break;
      default:
        color = '#cc88ff';
        shadowColor = '#6622cc';
    }
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.font = `bold ${180 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = shadowColor;
    this.ctx.shadowBlur = 50 * scale;
    this.ctx.fillText(grade, x, y);
    this.ctx.font = `bold ${28 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText(
      `分数: ${state.result.score}  最大连击: ${state.result.maxCombo}`,
      x,
      y + 130 * scale
    );
    this.ctx.font = `${18 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.fillStyle = 'rgba(200, 220, 255, 0.85)';
    this.ctx.fillText(
      `完美: ${state.result.perfectCount}  普通: ${state.result.normalCount}  失误: ${state.result.missCount}`,
      x,
      y + 170 * scale
    );
    this.ctx.restore();
  }

  destroy(): void {
    this.stars = [];
  }
}
