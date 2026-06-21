import type { GameState, GameElement } from '../types';

export class RenderCanvas {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: GameState | null = null;
  private isEditorMode = true;
  private gridSize = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
  }

  setEditorMode(mode: boolean): void {
    this.isEditorMode = mode;
  }

  setState(state: GameState): void {
    this.state = state;
    this.render();
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(dpr, dpr);
    if (this.state) this.render();
  }

  render(): void {
    if (!this.state) return;
    const { ctx, canvas } = this;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);
    this.drawGrid(w, h);

    const sorted = [...this.state.elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const el of sorted) {
      this.drawElement(el);
    }

    if (!this.isEditorMode) {
      this.drawFPS(this.state.fps);
      this.drawScore(this.state.score);
      if (this.state.isPaused) {
        this.drawPauseOverlay(w, h);
      }
    }
  }

  private drawGrid(w: number, h: number): void {
    const { ctx } = this;
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(0, 0, w, h);

    if (!this.isEditorMode) return;

    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += this.gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += this.gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  private drawElement(el: GameElement): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(el.x, el.y);
    ctx.rotate((el.rotation * Math.PI) / 180);

    if (el.type === 'rect') {
      ctx.fillStyle = el.color;
      ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
      if (this.isEditorMode && this.state?.selectedElementId === el.id) {
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-el.width / 2 - 3, -el.height / 2 - 3, el.width + 6, el.height + 6);
        ctx.setLineDash([]);
        this.drawHandles(-el.width / 2, -el.height / 2, el.width, el.height);
      }
    } else if (el.type === 'circle') {
      ctx.beginPath();
      ctx.fillStyle = el.color;
      ctx.arc(0, 0, el.radius, 0, Math.PI * 2);
      ctx.fill();
      if (this.isEditorMode && this.state?.selectedElementId === el.id) {
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, el.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (el.type === 'text') {
      ctx.fillStyle = el.color;
      ctx.font = `${el.fontSize || 24}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.textContent || '', 0, 0);
      if (this.isEditorMode && this.state?.selectedElementId === el.id) {
        const metrics = ctx.measureText(el.textContent || '');
        const tw = metrics.width;
        const th = el.fontSize || 24;
        ctx.strokeStyle = '#4A90D9';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-tw / 2 - 4, -th / 2 - 4, tw + 8, th + 8);
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }

  private drawHandles(x: number, y: number, w: number, h: number): void {
    const { ctx } = this;
    const size = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 1.5;
    const positions = [
      [x - 3, y - 3],
      [x + w + 3 - size, y - 3],
      [x - 3, y + h + 3 - size],
      [x + w + 3 - size, y + h + 3 - size]
    ];
    for (const [px, py] of positions) {
      ctx.fillRect(px, py, size, size);
      ctx.strokeRect(px, py, size, size);
    }
  }

  private drawFPS(fps: number): void {
    const { ctx } = this;
    const text = `${fps} FPS`;
    ctx.font = '14px monospace';
    const metrics = ctx.measureText(text);
    const padding = 8;
    const x = this.canvas.clientWidth - metrics.width - padding * 2;
    const y = 12;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(x, y, metrics.width + padding * 2, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + padding, y + 5);
  }

  private drawScore(score: number): void {
    const { ctx } = this;
    const text = `得分: ${score}`;
    ctx.font = 'bold 18px sans-serif';
    const metrics = ctx.measureText(text);
    const padding = 8;
    const x = 12;
    const y = 12;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(x, y, metrics.width + padding * 2, 28, 4);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + padding, y + 5);
  }

  private drawPauseOverlay(w: number, h: number): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('已暂停', w / 2, h / 2);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const { ctx } = this;
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
}
