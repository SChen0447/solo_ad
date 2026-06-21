import { Particle } from './Player';
import { Obstacle } from './ObstacleGenerator';
import { Collectible } from './CollectibleGenerator';

interface FlowLine {
  x: number;
  speed: number;
}

export interface RenderState {
  playerX: number;
  playerY: number;
  playerRadius: number;
  playerBlinking: boolean;
  playerBlinkVisible: boolean;
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  score: number;
  scoreScale: number;
  orbsCollected: number;
  highScore: number;
  progressRatio: number;
  screenFlash: number;
  redBorderAlpha: number;
  gameOver: boolean;
  canvasWidth: number;
  canvasHeight: number;
  time: number;
  bgTransition: number;
  progressFlashing: boolean;
  lives: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private flowLines: FlowLine[] = [];
  private flowLineTimer = 0;
  private mouseX = 0;
  private mouseY = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setMouse(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  getReplayButtonBounds(cw: number, ch: number) {
    const bw = 180, bh = 50;
    const ph = 300;
    const py = ch / 2 - ph / 2;
    return { x: cw / 2 - bw / 2, y: py + ph - 75, w: bw, h: bh };
  }

  isReplayButtonHovered(cw: number, ch: number): boolean {
    const b = this.getReplayButtonBounds(cw, ch);
    return this.mouseX >= b.x && this.mouseX <= b.x + b.w &&
           this.mouseY >= b.y && this.mouseY <= b.y + b.h;
  }

  render(state: RenderState, dt: number) {
    const { ctx } = this;
    const { canvasWidth: w, canvasHeight: h } = state;

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(state);
    this.updateAndDrawFlowLines(dt, w, h);
    this.drawCollectibles(state);
    this.drawObstacles(state);
    this.drawParticles(state);
    this.drawPlayer(state);
    this.drawUI(state);
    this.drawEffects(state);

    if (state.gameOver) {
      this.drawGameOver(state);
    }
  }

  private drawBackground(state: RenderState) {
    const { ctx } = this;
    const { canvasWidth: w, canvasHeight: h, bgTransition: t } = state;

    const topR = Math.floor(0x0D + (0x2D - 0x0D) * t);
    const topG = Math.floor(0x0D + (0x0A - 0x0D) * t);
    const topB = Math.floor(0x2B + (0x4E - 0x2B) * t);

    const botR = Math.floor(0x1A + (0x4E - 0x1A) * t);
    const botG = Math.floor(0x1A + (0x0A - 0x1A) * t);
    const botB = Math.floor(0x3E + (0x4A - 0x3E) * t);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
    grad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private updateAndDrawFlowLines(dt: number, w: number, h: number) {
    this.flowLineTimer += dt;
    if (this.flowLineTimer >= 0.3) {
      this.flowLineTimer = 0;
      const count = 6 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        this.flowLines.push({
          x: Math.random() * w * 0.3,
          speed: 60 + Math.random() * 180
        });
      }
    }

    for (const line of this.flowLines) {
      line.x += line.speed * dt;
    }
    this.flowLines = this.flowLines.filter(l => l.x < w + 5);

    const { ctx } = this;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    for (const line of this.flowLines) {
      ctx.beginPath();
      ctx.moveTo(line.x, 0);
      ctx.lineTo(line.x, h);
      ctx.stroke();
    }
  }

  private drawCollectibles(state: RenderState) {
    const { ctx } = this;
    for (const col of state.collectibles) {
      if (!col.active) continue;
      const pulseScale = 1 + 0.2 * Math.sin(col.pulsePhase);
      const r = col.radius * pulseScale;

      ctx.save();
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 18;

      const grad = ctx.createRadialGradient(col.x, col.y, 0, col.x, col.y, r * 1.8);
      grad.addColorStop(0, 'rgba(0, 255, 255, 1)');
      grad.addColorStop(0.4, 'rgba(0, 255, 255, 0.5)');
      grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(col.x, col.y, r * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(col.x, col.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawObstacles(state: RenderState) {
    const { ctx } = this;
    for (const obs of state.obstacles) {
      ctx.save();
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 14;

      ctx.fillStyle = '#FF0055';
      ctx.fillRect(obs.x, obs.y, obs.size, obs.size);

      ctx.strokeStyle = 'rgba(255, 0, 85, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x - 3, obs.y - 3, obs.size + 6, obs.size + 6);

      ctx.restore();
    }
  }

  private drawParticles(state: RenderState) {
    const { ctx } = this;
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPlayer(state: RenderState) {
    const { ctx } = this;
    const { playerX: x, playerY: y, playerRadius: r, playerBlinking, playerBlinkVisible } = state;

    if (playerBlinking && !playerBlinkVisible) return;

    ctx.save();
    ctx.shadowColor = playerBlinking ? '#FF0000' : '#00FFFF';
    ctx.shadowBlur = 22;

    if (playerBlinking) {
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, '#00FFFF');
      grad.addColorStop(1, '#FF00FF');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawUI(state: RenderState) {
    const { ctx } = this;
    const { canvasWidth: w, canvasHeight: h, score, scoreScale, progressRatio, progressFlashing, lives, time } = state;

    ctx.save();
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const sx = w / 2;
    const sy = 18;
    ctx.translate(sx, sy);
    ctx.scale(scoreScale, scoreScale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Score: ${score}`, 0, 0);
    ctx.restore();

    ctx.save();
    const lifeR = 6;
    const lifeY = 22;
    for (let i = 0; i < 3; i++) {
      const lx = 20 + i * 22;
      if (i < lives) {
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#00FFFF';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,255,255,0.15)';
      }
      ctx.beginPath();
      ctx.arc(lx, lifeY, lifeR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const barY = h - 6;
    const barH = 6;
    const filledW = w * Math.min(progressRatio, 1);

    let barAlpha = 1;
    if (progressFlashing) {
      barAlpha = 0.5 + 0.5 * Math.sin(time * 12);
    }

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#222';
    ctx.fillRect(0, barY, w, barH);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = barAlpha;
    const barGrad = ctx.createLinearGradient(0, barY, filledW, barY);
    barGrad.addColorStop(0, '#00FFFF');
    barGrad.addColorStop(1, '#FF00FF');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, barY, filledW, barH);
    ctx.restore();
  }

  private drawEffects(state: RenderState) {
    const { ctx } = this;
    const { canvasWidth: w, canvasHeight: h, screenFlash, redBorderAlpha } = state;

    if (screenFlash > 0) {
      ctx.save();
      ctx.globalAlpha = screenFlash;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (redBorderAlpha > 0) {
      ctx.save();
      const a = redBorderAlpha * 0.5;
      const bw = 10;

      const gt = ctx.createLinearGradient(0, 0, 0, bw);
      gt.addColorStop(0, `rgba(255,0,0,${a})`);
      gt.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = gt;
      ctx.fillRect(0, 0, w, bw);

      const gb = ctx.createLinearGradient(0, h - bw, 0, h);
      gb.addColorStop(0, 'rgba(255,0,0,0)');
      gb.addColorStop(1, `rgba(255,0,0,${a})`);
      ctx.fillStyle = gb;
      ctx.fillRect(0, h - bw, w, bw);

      const gl = ctx.createLinearGradient(0, 0, bw, 0);
      gl.addColorStop(0, `rgba(255,0,0,${a})`);
      gl.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, bw, h);

      const gr = ctx.createLinearGradient(w - bw, 0, w, 0);
      gr.addColorStop(0, 'rgba(255,0,0,0)');
      gr.addColorStop(1, `rgba(255,0,0,${a})`);
      ctx.fillStyle = gr;
      ctx.fillRect(w - bw, 0, bw, h);

      ctx.restore();
    }
  }

  private drawGameOver(state: RenderState) {
    const { ctx } = this;
    const { canvasWidth: w, canvasHeight: h, score, orbsCollected, highScore } = state;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const pw = 400, ph = 300;
    const px = w / 2 - pw / 2;
    const py = h / 2 - ph / 2;

    const panelGrad = ctx.createLinearGradient(px, py, px, py + ph);
    panelGrad.addColorStop(0, 'rgba(26, 26, 26, 0.88)');
    panelGrad.addColorStop(1, 'rgba(45, 45, 45, 0.88)');
    ctx.fillStyle = panelGrad;
    this.roundRect(ctx, px, py, pw, ph, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, px, py, pw, ph, 16);
    ctx.stroke();

    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('GAME OVER', w / 2, py + 48);
    ctx.shadowBlur = 0;

    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(`Final Score: ${score}`, w / 2, py + 100);

    ctx.fillStyle = '#AAAACC';
    ctx.fillText(`Orbs Collected: ${orbsCollected}`, w / 2, py + 135);

    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 6;
    ctx.fillText(`High Score: ${highScore}`, w / 2, py + 170);
    ctx.shadowBlur = 0;

    const bw = 180, bh = 50;
    const bx = w / 2 - bw / 2;
    const by = py + ph - 75;
    const hovered = this.isReplayButtonHovered(w, h);

    ctx.save();
    if (hovered) {
      ctx.translate(w / 2, by + bh / 2);
      ctx.scale(1.05, 1.05);
      ctx.translate(-w / 2, -(by + bh / 2));
    }

    const btnGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    if (hovered) {
      btnGrad.addColorStop(0, '#00CCCC');
      btnGrad.addColorStop(1, '#CC00CC');
    } else {
      btnGrad.addColorStop(0, '#00FFFF');
      btnGrad.addColorStop(1, '#FF00FF');
    }
    ctx.fillStyle = btnGrad;
    this.roundRect(ctx, bx, by, bw, bh, 25);
    ctx.fill();

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#0D0D2B';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REPLAY', w / 2, by + bh / 2);
    ctx.restore();

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
