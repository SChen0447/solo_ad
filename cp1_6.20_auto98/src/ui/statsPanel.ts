import type { SegmentStats } from '../data/dataProvider';

export class StatsPanel {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private visible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 280px;
      background: rgba(30, 42, 58, 0.92);
      border: 1px solid #3a5a8a;
      border-radius: 12px;
      padding: 16px;
      color: #c0d0e0;
      font-family: sans-serif;
      font-size: 13px;
      z-index: 100;
      display: none;
      backdrop-filter: blur(8px);
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 248;
    this.canvas.height = 120;
    this.canvas.style.cssText = `
      width: 100%;
      height: 120px;
      background: #2a3a4a;
      border-radius: 6px;
      margin-top: 10px;
    `;

    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
    document.body.appendChild(this.container);
  }

  show(stats: SegmentStats): void {
    this.visible = true;
    this.container.style.display = 'block';

    const infoEl = this.container.querySelector('.stats-info') as HTMLDivElement | null;
    if (infoEl) infoEl.remove();

    const info = document.createElement('div');
    info.className = 'stats-info';
    info.innerHTML = `
      <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#e0e0e0;">路段 #${stats.segmentId}</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span>车流密度</span>
        <span style="color:#60a5fa;font-weight:600;">${stats.currentDensity.toFixed(1)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span>平均速度</span>
        <span style="color:#60a5fa;font-weight:600;">${stats.currentSpeed.toFixed(1)} km/h</span>
      </div>
    `;
    this.container.insertBefore(info, this.canvas);

    this.drawChart(stats);
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  isVisible(): boolean {
    return this.visible;
  }

  private drawChart(stats: SegmentStats): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const history = stats.densityHistory;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(0, 0, w, h);

    if (history.length < 2) return;

    const padding = { top: 10, bottom: 20, left: 30, right: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#7a8a9a';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = 100 - i * 25;
      const y = padding.top + (chartH / 4) * i;
      ctx.fillText(val.toString(), padding.left - 4, y + 3);
    }

    const maxFrames = 60;
    const stepX = chartW / (maxFrames - 1);

    for (let i = 1; i < history.length; i++) {
      const x0 = padding.left + (i - 1) * stepX;
      const x1 = padding.left + i * stepX;
      const y0 = padding.top + chartH * (1 - history[i - 1] / 100);
      const y1 = padding.top + chartH * (1 - history[i] / 100);

      const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
      const d0 = history[i - 1];
      const d1 = history[i];
      gradient.addColorStop(0, this.densityToCSSColor(d0));
      gradient.addColorStop(1, this.densityToCSSColor(d1));

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const lastX = padding.left + (history.length - 1) * stepX;
    const lastY = padding.top + chartH * (1 - history[history.length - 1] / 100);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#7a8a9a';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0', padding.left, h - 4);
    ctx.fillText('59', w - padding.right, h - 4);
  }

  private densityToCSSColor(d: number): string {
    if (d < 30) {
      return '#00cc44';
    } else if (d < 70) {
      const t = (d - 30) / 40;
      const r = Math.round(0 + 255 * t);
      const g = Math.round(204 - 0 * t);
      const b = Math.round(68 - 68 * t);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (d - 70) / 30;
      const r = 255;
      const g = Math.round(204 * (1 - t));
      const b = 0;
      return `rgb(${r},${g},${b})`;
    }
  }
}
