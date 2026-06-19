import { COLORS, GameData, ComboPulse, ResultPanelAnim, ScoreGrade, DiamondIcon, TOTAL_BEAT_POINTS } from './Types';
import { formatScore, easeOutElastic, easeOutCubic, clamp } from './utils';

export class UIManager {
  private time: number;
  comboPulse: ComboPulse;
  resultAnim: ResultPanelAnim;
  diamonds: DiamondIcon[];
  hoveredButton: string | null;
  mouseX: number;
  mouseY: number;

  constructor() {
    this.time = 0;
    this.comboPulse = { scale: 1, targetScale: 1, animating: false };
    this.resultAnim = { active: false, progress: 0, scoreRolling: 0, targetScore: 0 };
    this.diamonds = this.initDiamonds();
    this.hoveredButton = null;
    this.mouseX = 0;
    this.mouseY = 0;
  }

  private initDiamonds(): DiamondIcon[] {
    return [
      { filled: true, color: COLORS.DIAMOND_X1, pulse: 0 },
      { filled: false, color: COLORS.DIAMOND_X2, pulse: 0 },
      { filled: false, color: COLORS.DIAMOND_X3, pulse: 0 },
      { filled: false, color: COLORS.DIAMOND_X4, pulse: 0 },
      { filled: false, color: COLORS.DIAMOND_X5, pulse: 0 },
    ];
  }

  setMultiplier(level: number): void {
    const lvl = clamp(level, 1, 5);
    for (let i = 0; i < this.diamonds.length; i++) {
      const wasFilled = this.diamonds[i].filled;
      this.diamonds[i].filled = i < lvl;
      if (this.diamonds[i].filled && !wasFilled) {
        this.diamonds[i].pulse = 1;
      }
    }
  }

  triggerComboPulse(): void {
    this.comboPulse.targetScale = 1.4;
    this.comboPulse.animating = true;
  }

  showResult(data: GameData): void {
    this.resultAnim = {
      active: true,
      progress: 0,
      scoreRolling: 0,
      targetScore: data.score
    };
  }

  hideResult(): void {
    this.resultAnim.active = false;
    this.resultAnim.progress = 0;
  }

  setMouse(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  isRestartButtonClicked(w: number, h: number): boolean {
    const panelW = Math.min(420, w - 40);
    const panelH = 380;
    const px = (w - panelW) / 2;
    const py = (h - panelH) / 2;
    const btnW = panelW * 0.55;
    const btnH = 48;
    const bx = px + (panelW - btnW) / 2;
    const by = py + panelH - 70;
    return this.mouseX >= bx && this.mouseX <= bx + btnW &&
           this.mouseY >= by && this.mouseY <= by + btnH;
  }

  update(dt: number): void {
    const d = Math.max(dt, 1);
    this.time += d;

    if (this.comboPulse.animating) {
      const diff = this.comboPulse.targetScale - this.comboPulse.scale;
      this.comboPulse.scale += diff * 0.2 * d;
      if (Math.abs(diff) < 0.01) {
        if (this.comboPulse.targetScale > 1) {
          this.comboPulse.targetScale = 1;
        } else {
          this.comboPulse.scale = 1;
          this.comboPulse.animating = false;
        }
      }
    }

    for (const dmd of this.diamonds) {
      if (dmd.pulse > 0) {
        dmd.pulse *= 0.95;
        if (dmd.pulse < 0.01) dmd.pulse = 0;
      }
    }

    if (this.resultAnim.active) {
      const targetProgress = 1;
      const progressDiff = targetProgress - this.resultAnim.progress;
      this.resultAnim.progress += progressDiff * 0.08 * d;
      const scoreDiff = this.resultAnim.targetScore - this.resultAnim.scoreRolling;
      this.resultAnim.scoreRolling += scoreDiff * 0.06 * d;
      if (this.resultAnim.progress >= 0.999) {
        this.resultAnim.progress = 1;
      }
      if (Math.abs(scoreDiff) < 0.5) {
        this.resultAnim.scoreRolling = this.resultAnim.targetScore;
      }
    }
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private drawDiamond(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, size: number, color: string, filled: boolean, glow: boolean
  ): void {
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.75, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.75, cy);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
    }
    ctx.restore();
  }

  private drawScorePanel(ctx: CanvasRenderingContext2D, x: number, y: number, data: GameData, isNarrow: boolean): void {
    const w = isNarrow ? 200 : 240;
    const h = isNarrow ? 90 : 110;

    ctx.save();
    this.drawRoundedRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = 'rgba(10, 8, 40, 0.75)';
    ctx.fill();
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(0, 240, 255, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = COLORS.SCORE_COLOR;
    ctx.font = isNarrow ? 'bold 12px sans-serif' : 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', x + 16, y + 26);
    ctx.font = isNarrow ? 'bold 20px monospace' : 'bold 24px monospace';
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 8;
    ctx.fillText(formatScore(data.score), x + 16, y + 52);
    ctx.restore();

    const dSize = isNarrow ? 8 : 10;
    const dStartX = x + w - 16 - (this.diamonds.length - 1) * (dSize * 1.8);
    const dY = y + 26;
    for (let i = 0; i < this.diamonds.length; i++) {
      const dmd = this.diamonds[i];
      const scale = 1 + dmd.pulse * 0.5;
      const dx = dStartX + i * dSize * 1.8;
      ctx.save();
      ctx.translate(dx, dY);
      ctx.scale(scale, scale);
      this.drawDiamond(ctx, 0, 0, dSize, dmd.color, dmd.filled, dmd.filled);
      ctx.restore();
    }

    ctx.save();
    const mText = `x${data.multiplier.toFixed(0)}`;
    const mColor = this.diamonds[clamp(data.multiplier - 1, 0, 4)].color;
    ctx.fillStyle = mColor;
    ctx.shadowColor = mColor;
    ctx.shadowBlur = 6;
    ctx.font = isNarrow ? 'bold 11px sans-serif' : 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(mText, x + w - 16, y + h - 16);
    ctx.restore();
  }

  private drawCombo(ctx: CanvasRenderingContext2D, x: number, y: number, data: GameData): void {
    if (data.combo < 10) return;
    const scale = this.comboPulse.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'right';
    ctx.fillText('COMBO', 0, -18);

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = COLORS.COMBO_COLOR;
    ctx.shadowColor = COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 15;
    ctx.fillText(data.combo.toString(), 0, 18);

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 10;
    ctx.fillText('HITS!', 0, 42);
    ctx.restore();
  }

  private drawProgressBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, data: GameData): void {
    const barW = w;
    const barH = 14;
    const radius = 7;

    ctx.save();
    this.drawRoundedRect(ctx, x, y, barW, barH, radius);
    ctx.fillStyle = 'rgba(20, 15, 60, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const fillW = Math.max(2, clamp(barW - 4, 4, (barW - 4) * data.progress));
    if (fillW > radius * 2) {
      ctx.save();
      ctx.beginPath();
      this.drawRoundedRect(ctx, x + 2, y + 2, fillW, barH - 4, radius - 2);
      ctx.clip();
      const grad = ctx.createLinearGradient(x, y, x + barW, y);
      grad.addColorStop(0, COLORS.PROGRESS_START);
      grad.addColorStop(0.5, COLORS.PROGRESS_MID);
      grad.addColorStop(1, COLORS.PROGRESS_END);
      ctx.fillStyle = grad;
      ctx.shadowColor = COLORS.NEON_CYAN;
      ctx.shadowBlur = 12;
      ctx.fillRect(x + 2, y + 2, barW, barH - 4);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(`${Math.floor(data.progress * 100)}%`, x + barW, y - 4);
    ctx.restore();
  }

  private drawGrade(ctx: CanvasRenderingContext2D, grade: ScoreGrade, cx: number, cy: number, size: number, alpha: number): void {
    const colors: Record<ScoreGrade, string> = {
      S: '#ffdd00',
      A: COLORS.NEON_CYAN,
      B: COLORS.NEON_GREEN,
      C: COLORS.NEON_MAGENTA,
      D: '#ff6688'
    };
    const color = colors[grade];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(grade, cx, cy);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText(grade, cx, cy);
    ctx.restore();
  }

  drawResultPanel(ctx: CanvasRenderingContext2D, w: number, h: number, data: GameData): void {
    if (!this.resultAnim.active) return;

    const animProgress = easeOutElastic(this.resultAnim.progress);
    const panelW = Math.min(420, w - 40);
    const panelH = 380;
    const panelWAnim = panelW * animProgress;
    const panelHAnim = panelH * animProgress;
    const px = (w - panelWAnim) / 2;
    const py = (h - panelHAnim) / 2;
    const alpha = clamp(this.resultAnim.progress * 1.5, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawRoundedRect(ctx, px, py, panelWAnim, panelHAnim, 24);
    const grad = ctx.createLinearGradient(px, py, px, py + panelHAnim);
    grad.addColorStop(0, 'rgba(20, 10, 60, 0.95)');
    grad.addColorStop(1, 'rgba(40, 10, 80, 0.95)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowColor = COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = COLORS.NEON_MAGENTA;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (this.resultAnim.progress < 0.3) return;
    const innerProgress = easeOutCubic(clamp((this.resultAnim.progress - 0.3) / 0.7, 0, 1));

    ctx.save();
    ctx.globalAlpha = alpha * innerProgress;
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = 15;
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('关卡完成', w / 2, py + 50);
    ctx.restore();

    if (innerProgress > 0.15) {
      const gradeProgress = easeOutCubic(clamp((innerProgress - 0.15) / 0.3, 0, 1));
      const gradeSize = 72 * gradeProgress;
      this.drawGrade(ctx, data.grade, w / 2, py + 125, gradeSize, alpha * gradeProgress);
    }

    const statY = py + 200;
    const statLabels = ['总分', '最高连击', '节拍命中'];
    const statValues = [
      formatScore(this.resultAnim.scoreRolling),
      data.maxCombo.toString(),
      `${Math.floor((data.score / (TOTAL_BEAT_POINTS * 1000 * 5)) * TOTAL_BEAT_POINTS)}/${TOTAL_BEAT_POINTS}`
    ];
    const statColors = [COLORS.NEON_CYAN, COLORS.NEON_MAGENTA, COLORS.NEON_GREEN];

    for (let i = 0; i < 3; i++) {
      const si = clamp((innerProgress - 0.45 - i * 0.08) / 0.2, 0, 1);
      if (si <= 0) continue;
      const easeSi = easeOutCubic(si);
      const itemX = w / 2 + (i - 1) * 110;
      const itemY = statY + (1 - easeSi) * 15;

      ctx.save();
      ctx.globalAlpha = alpha * easeSi;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(statLabels[i], itemX, itemY);
      ctx.fillStyle = statColors[i];
      ctx.shadowColor = statColors[i];
      ctx.shadowBlur = 10;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(statValues[i], itemX, itemY + 28);
      ctx.restore();
    }

    if (innerProgress > 0.8) {
      const btnProgress = easeOutCubic(clamp((innerProgress - 0.8) / 0.2, 0, 1));
      const btnW = panelW * 0.55;
      const btnH = 48;
      const bx = (w - btnW) / 2;
      const by = py + panelH - 70;

      const isHovered = this.isRestartButtonClicked(w, h);
      const scale = isHovered ? 1.1 : 1.0;
      const cx = bx + btnW / 2;
      const cy = by + btnH / 2;

      ctx.save();
      ctx.globalAlpha = alpha * btnProgress;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      this.drawRoundedRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 14);
      const btnGrad = ctx.createLinearGradient(0, -btnH / 2, 0, btnH / 2);
      if (isHovered) {
        btnGrad.addColorStop(0, 'rgba(0, 240, 255, 0.9)');
        btnGrad.addColorStop(1, 'rgba(255, 0, 255, 0.9)');
      } else {
        btnGrad.addColorStop(0, 'rgba(0, 200, 220, 0.7)');
        btnGrad.addColorStop(1, 'rgba(200, 0, 220, 0.7)');
      }
      ctx.fillStyle = btnGrad;
      ctx.fill();
      ctx.shadowColor = COLORS.NEON_CYAN;
      ctx.shadowBlur = isHovered ? 25 : 15;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 5;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('重新挑战', 0, 0);
      ctx.restore();
    }
  }

  drawStartMenu(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    const titleY = h * 0.35;
    const tPulse = 1 + Math.sin(this.time * 0.04) * 0.03;
    ctx.translate(w / 2, titleY);
    ctx.scale(tPulse, tPulse);
    ctx.shadowColor = COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 40;
    ctx.fillStyle = COLORS.NEON_CYAN;
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('深渊回声', 0, 0);
    ctx.shadowColor = COLORS.NEON_MAGENTA;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.NEON_MAGENTA;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('ABYSS ECHOES', 0, 35);
    ctx.restore();

    ctx.save();
    const tipY = h * 0.58;
    const alpha = 0.5 + 0.5 * Math.sin(this.time * 0.06);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.NEON_GREEN;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 [ 空格键 ] 跳跃 / 二段跳', w / 2, tipY);
    ctx.fillText('按 [ 回车 ] 开始游戏', w / 2, tipY + 32);
    ctx.restore();

    ctx.save();
    const btnW = 200;
    const btnH = 52;
    const bx = (w - btnW) / 2;
    const by = h * 0.72;
    const cx = bx + btnW / 2;
    const cy = by + btnH / 2;

    const dist = Math.sqrt((this.mouseX - cx) ** 2 + (this.mouseY - cy) ** 2);
    const isHover = dist < btnW / 2;
    const scale = isHover ? 1.1 : 1.0;
    this.hoveredButton = isHover ? 'start' : null;

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    this.drawRoundedRect(ctx, -btnW / 2, -btnH / 2, btnW, btnH, 16);
    const btnGrad = ctx.createLinearGradient(0, -btnH / 2, 0, btnH / 2);
    if (isHover) {
      btnGrad.addColorStop(0, 'rgba(0, 240, 255, 0.95)');
      btnGrad.addColorStop(1, 'rgba(255, 0, 255, 0.95)');
    } else {
      btnGrad.addColorStop(0, 'rgba(0, 200, 220, 0.8)');
      btnGrad.addColorStop(1, 'rgba(200, 0, 220, 0.8)');
    }
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.shadowColor = COLORS.NEON_CYAN;
    ctx.shadowBlur = isHover ? 30 : 18;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始游戏', 0, 0);
    ctx.restore();
  }

  isStartButtonHovered(): boolean {
    return this.hoveredButton === 'start';
  }

  render(ctx: CanvasRenderingContext2D, data: GameData, state: string, w: number, h: number): void {
    const isNarrow = w < 768;

    if (state === 'MENU') {
      this.drawStartMenu(ctx, w, h);
      return;
    }

    if (isNarrow) {
      this.drawScorePanel(ctx, 12, 12, data, true);
      this.drawCombo(ctx, w - 20, 55, data);
      this.drawProgressBar(ctx, 12, h - 36, w - 24, data);
    } else {
      this.drawScorePanel(ctx, w - 264, 16, data, false);
      this.drawCombo(ctx, w - 28, 200, data);
      this.drawProgressBar(ctx, w - 264, 140, 240, data);
    }

    if (state === 'FINISHED') {
      this.drawResultPanel(ctx, w, h, data);
    }
  }
}
