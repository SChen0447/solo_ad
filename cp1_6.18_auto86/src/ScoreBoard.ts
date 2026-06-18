import { useGameStore } from './store';

interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ScoreBoard {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pulsePhase: number = 0;
  private lastComboPulse: number = 0;
  private currentCombo: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
  }

  private scale(): number {
    const base = 1920;
    return Math.max(0.75, this.canvas.width / base);
  }

  private getPanelRect(): PanelRect {
    const s = this.scale();
    return {
      x: 24 * s,
      y: 24 * s,
      w: 260 * s,
      h: 220 * s
    };
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  render(dt: number): void {
    const state = useGameStore.getState();
    const s = this.scale();
    const ctx = this.ctx;

    this.renderPanel(s);
    this.renderProgress(s, state.currentTime, state.levelDuration, state.hits, state.total);
    this.renderCenterCombo(s, state.combo, dt);
  }

  private renderPanel(s: number): void {
    const ctx = this.ctx;
    const { x, y, w, h } = this.getPanelRect();
    const state = useGameStore.getState();
    const r = 16 * s;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 180, 255, 0.15)';
    ctx.shadowBlur = 20 * s;

    ctx.fillStyle = 'rgba(15, 25, 50, 0.55)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5 * s;
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, r);
    ctx.clip();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x, y, w, h * 0.4);
    ctx.restore();

    const padX = 24 * s;
    const lineGap = 46 * s;
    const startY = y + 46 * s;
    const labelSize = 14 * s;
    const valueSize = 28 * s;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.font = `${labelSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(180, 210, 255, 0.85)';
    ctx.fillText('SCORE', x + padX, startY);

    ctx.font = `600 ${valueSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.score.toString(), x + padX, startY + 30 * s);

    const acc = state.total > 0 ? (state.hits / state.total) * 100 : 100;

    ctx.font = `${labelSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(180, 210, 255, 0.85)';
    ctx.fillText('COMBO', x + padX, startY + lineGap);
    ctx.fillText('ACCURACY', x + padX, startY + lineGap * 2);

    const comboColor = state.combo >= 10 ? '#ffd700' : '#7ee8fa';
    ctx.font = `600 ${valueSize}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = comboColor;
    ctx.fillText(state.combo.toString(), x + padX, startY + lineGap + 30 * s);

    ctx.fillStyle = acc >= 80 ? '#2ed573' : acc >= 60 ? '#ffa502' : '#ff4757';
    ctx.fillText(`${acc.toFixed(1)}%`, x + padX, startY + lineGap * 2 + 30 * s);
  }

  private renderProgress(s: number, cur: number, total: number, hits: number, judged: number): void {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const barW = W * 0.6;
    const barH = 14 * s;
    const x = (W - barW) / 2;
    const y = H - 50 * s;
    const r = barH / 2;

    const ratio = Math.max(0, Math.min(1, cur / total));
    const acc = judged > 0 ? hits / judged : 1;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10 * s;
    ctx.fillStyle = 'rgba(10, 20, 40, 0.7)';
    this.roundRect(ctx, x, y, barW, barH, r);
    ctx.fill();
    ctx.restore();

    const fillW = Math.max(0, barW * ratio - 2);
    if (fillW > 0) {
      let color: string;
      if (acc >= 0.8) color = '#2ed573';
      else if (acc >= 0.6) color = '#ffa502';
      else color = '#ff4757';

      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, this.lighten(color, 0.3));
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, this.darken(color, 0.25));

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14 * s;
      ctx.fillStyle = grad;
      this.roundRect(ctx, x + 2, y + 2, fillW, barH - 4, r - 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#ffffff';
      this.roundRect(ctx, x + 4, y + 4, fillW - 4, (barH - 8) * 0.45, r - 4);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.font = `${12 * s}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(200, 220, 255, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PROGRESS  ${(ratio * 100).toFixed(0)}%`, x + barW / 2, y + barH / 2);
    ctx.restore();
  }

  private renderCenterCombo(s: number, combo: number, dt: number): void {
    if (combo < 5) {
      this.currentCombo = 0;
      return;
    }
    if (combo !== this.currentCombo) {
      this.currentCombo = combo;
      this.lastComboPulse = performance.now();
    }
    const elapsed = (performance.now() - this.lastComboPulse) / 1000;
    const t = Math.min(1, elapsed / 0.6);
    const pulse = 1 + 0.25 * Math.sin(t * Math.PI) * Math.exp(-t * 3);
    this.pulsePhase += dt * 4;

    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height * 0.25;
    const base = 56 * s * pulse;

    const glow = combo >= 10 ? 'rgba(255, 215, 0, 0.35)' : 'rgba(126, 232, 250, 0.28)';
    const textColor = combo >= 10 ? '#ffd700' : '#ffffff';

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glow;
    ctx.shadowBlur = 30 * s;
    ctx.font = `700 ${base}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = textColor;
    ctx.fillText(`${combo} COMBO`, cx, cy);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.font = `${18 * s}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(220, 235, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(combo >= 10 ? 'KEEP GOING!' : 'NICE!', cx, cy + base * 0.75);
    ctx.restore();
  }

  private lighten(hex: string, amt: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.round(r + (255 - r) * amt)}, ${Math.round(g + (255 - g) * amt)}, ${Math.round(b + (255 - b) * amt)})`;
  }

  private darken(hex: string, amt: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.round(r * (1 - amt))}, ${Math.round(g * (1 - amt))}, ${Math.round(b * (1 - amt))})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    const n = h.length === 3
      ? h.split('').map(c => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return { r: n[0], g: n[1], b: n[2] };
  }
}
