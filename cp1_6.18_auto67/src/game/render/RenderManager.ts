import { EntityManager } from '../systems/EntityManager';
import { Star, CANVAS_W, CANVAS_H, PLAYER_SIZE } from '../../types';

export class RenderManager {
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private entityManager: EntityManager;

  constructor(ctx: CanvasRenderingContext2D, entityManager: EntityManager) {
    this.ctx = ctx;
    this.entityManager = entityManager;
    this.initStars();
  }

  private initStars() {
    for (let i = 0; i < 80; i++) {
      const isBlue = Math.random() > 0.7;
      this.stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        brightness: 0.3 + Math.random() * 0.7,
        flickerSpeed: 1 + Math.random() * 3,
        flickerOffset: Math.random() * Math.PI * 2,
        color: isBlue ? '#aaccff' : '#ffffff',
      });
    }
  }

  render(time: number) {
    const ctx = this.ctx;
    const em = this.entityManager;

    ctx.save();
    ctx.translate(em.vfx.shakeOffsetX, em.vfx.shakeOffsetY);

    ctx.fillStyle = '#000011';
    ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

    this.renderStars(ctx, time);
    this.renderFragments(ctx);
    this.renderAsteroids(ctx);
    this.renderPlayer(ctx);
    em.vfx.renderParticles(ctx);
    em.vfx.renderFlash(ctx);

    ctx.restore();

    this.renderUI(ctx, time);

    if (em.gameOver) {
      this.renderGameOver(ctx, time);
    }

    if (em.restarting) {
      ctx.fillStyle = `rgba(0,0,0,${em.restartFadeAlpha})`;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D, time: number) {
    for (const star of this.stars) {
      const flicker = 0.5 + 0.5 * Math.sin(time * star.flickerSpeed + star.flickerOffset);
      const alpha = star.brightness * flicker;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.entityManager.player;
    if (!p.alive && this.entityManager.gameOver) return;

    for (const tp of p.tailParticles) {
      const alpha = Math.max(0, tp.life / tp.maxLife);
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = tp.color;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, tp.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const isFlashing = p.hitFlashTimer > 0 && Math.floor(p.hitFlashTimer * 10) % 2 === 0;

    ctx.save();
    ctx.translate(p.x, p.y);

    if (!isFlashing) {
      this.entityManager.vfx.renderGlow(ctx, 0, 0, 'rgba(100,150,255,0.15)', 25);
    }

    const grad = ctx.createLinearGradient(0, -PLAYER_SIZE, 0, PLAYER_SIZE);
    if (isFlashing) {
      grad.addColorStop(0, '#ff4444');
      grad.addColorStop(1, '#ff0000');
    } else {
      grad.addColorStop(0, '#4488ff');
      grad.addColorStop(1, '#2244aa');
    }

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_SIZE);
    ctx.lineTo(-PLAYER_SIZE * 0.7, PLAYER_SIZE * 0.6);
    ctx.lineTo(0, PLAYER_SIZE * 0.3);
    ctx.lineTo(PLAYER_SIZE * 0.7, PLAYER_SIZE * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderFragments(ctx: CanvasRenderingContext2D) {
    for (const frag of this.entityManager.fragments) {
      ctx.save();
      ctx.translate(frag.x, frag.y);
      ctx.rotate(frag.rotation);

      const glowR = frag.getGlowRadius();
      this.entityManager.vfx.renderGlow(ctx, 0, 0, frag.getGlowColor(), glowR);

      ctx.fillStyle = frag.getCoreColor();
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderAsteroids(ctx: CanvasRenderingContext2D) {
    for (const ast of this.entityManager.asteroids) {
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.rotation);

      ctx.fillStyle = '#666666';
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const r = ast.vertices[i];
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderUI(ctx: CanvasRenderingContext2D, time: number) {
    const sm = this.entityManager.scoreManager;

    ctx.save();
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'left';

    const comboShake = sm.comboShakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
    const comboX = 15 + comboShake;
    const comboY = 38;

    const isDecaying = sm.isComboDecaying(performance.now());
    const comboColor = isDecaying ? '#ff4444' : '#ffffff';

    ctx.save();
    ctx.translate(comboX, comboY);
    ctx.scale(sm.comboScale, sm.comboScale);

    ctx.fillStyle = '#000000';
    ctx.fillText(`${sm.combo}`, 2, 2);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeText(`${sm.combo}`, 0, 0);
    ctx.fillStyle = comboColor;
    ctx.fillText(`${sm.combo}`, 0, 0);

    ctx.restore();

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffd700aa';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`得分: ${sm.totalScore}`, 15, 58);
    ctx.shadowBlur = 0;

    this.renderEnergyBar(ctx);
    ctx.restore();
  }

  private renderEnergyBar(ctx: CanvasRenderingContext2D) {
    const energy = this.entityManager.player.energy;
    const barW = CANVAS_W - 30;
    const barH = 8;
    const barX = 15;
    const barY = CANVAS_H - 20;

    ctx.fillStyle = '#222222';
    ctx.fillRect(barX, barY, barW, barH);

    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, '#ff4444');
    grad.addColorStop(1, '#ff8800');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * (energy / 100), barH);

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  private renderGameOver(ctx: CanvasRenderingContext2D, time: number) {
    const em = this.entityManager;
    const fadeAlpha = Math.min(1, em.gameOverTimer / 1.5);
    ctx.fillStyle = `rgba(0,0,0,${fadeAlpha * 0.6})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (em.gameOverTimer > 0.5) {
      const pulse = 0.9 + 0.1 * Math.sin(time * 2);

      ctx.save();
      ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 40);
      ctx.scale(pulse, pulse);

      this.entityManager.vfx.renderGlow(ctx, 0, 0, 'rgba(180,0,0,0.3)', 80);

      ctx.font = 'bold 36px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';
      ctx.fillText('游戏结束', 2, 2);
      ctx.fillStyle = '#cc0000';
      ctx.fillText('游戏结束', 0, 0);

      ctx.restore();

      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`最终得分: ${em.scoreManager.totalScore}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
      ctx.fillText(`最高连击: ${em.scoreManager.maxCombo}`, CANVAS_W / 2, CANVAS_H / 2 + 48);
      ctx.shadowBlur = 0;

      if (em.gameOverTimer > 2) {
        const blink = Math.sin(time * 4) > 0;
        if (blink) {
          ctx.font = '14px monospace';
          ctx.fillStyle = '#aaaaaa';
          ctx.fillText('按 空格键 重新开始', CANVAS_W / 2, CANVAS_H / 2 + 85);
        }
      }
    }
  }
}
