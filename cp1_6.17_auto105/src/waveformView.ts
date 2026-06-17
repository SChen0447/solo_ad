import { SamplePoint } from './terrainManager';

export interface WaveformInteraction {
  onPointDrag: (index: number, newHeight: number) => void;
}

export class WaveformView {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private samples: SamplePoint[] = [];
  private padding = { top: 30, right: 20, bottom: 40, left: 50 };
  private draggingIndex: number | null = null;
  private hoverIndex: number | null = null;
  private interaction: WaveformInteraction;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement, interaction: WaveformInteraction) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.interaction = interaction;
    this.dpr = window.devicePixelRatio || 1;
    this.bindEvents();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.draw();
  }

  private bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseLeave());
  }

  private getChartRect() {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: this.padding.left,
      y: this.padding.top,
      w: rect.width - this.padding.left - this.padding.right,
      h: rect.height - this.padding.top - this.padding.bottom
    };
  }

  private getDataRange() {
    if (this.samples.length === 0) {
      return { minDist: 0, maxDist: 1, minHeight: -1, maxHeight: 5 };
    }
    const distances = this.samples.map(s => s.distance);
    const heights = this.samples.map(s => s.height);
    let minDist = Math.min(...distances);
    let maxDist = Math.max(...distances);
    let minHeight = Math.min(...heights);
    let maxHeight = Math.max(...heights);
    if (maxDist - minDist < 0.01) maxDist = minDist + 1;
    if (maxHeight - minHeight < 0.5) {
      const mid = (minHeight + maxHeight) / 2;
      minHeight = mid - 0.5;
      maxHeight = mid + 0.5;
    }
    minHeight = Math.min(minHeight - 0.3, -0.1);
    maxHeight = maxHeight + 0.3;
    return { minDist, maxDist, minHeight, maxHeight };
  }

  private distanceToX(distance: number): number {
    const chart = this.getChartRect();
    const range = this.getDataRange();
    return chart.x + ((distance - range.minDist) / (range.maxDist - range.minDist)) * chart.w;
  }

  private heightToY(height: number): number {
    const chart = this.getChartRect();
    const range = this.getDataRange();
    return chart.y + chart.h - ((height - range.minHeight) / (range.maxHeight - range.minHeight)) * chart.h;
  }

  private yToHeight(y: number): number {
    const chart = this.getChartRect();
    const range = this.getDataRange();
    return range.minHeight + (1 - (y - chart.y) / chart.h) * (range.maxHeight - range.minHeight);
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private findNearestPoint(mouseX: number, mouseY: number): number | null {
    const hitRadius = 10;
    let nearestIdx: number | null = null;
    let nearestDist = hitRadius;
    for (let i = 0; i < this.samples.length; i++) {
      const px = this.distanceToX(this.samples[i].distance);
      const py = this.heightToY(this.samples[i].height);
      const d = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    return nearestIdx;
  }

  private onMouseMove(e: MouseEvent) {
    const { x, y } = this.getMousePos(e);
    if (this.draggingIndex !== null) {
      const newHeight = this.yToHeight(y);
      const clamped = Math.max(-2, Math.min(8, newHeight));
      this.samples[this.draggingIndex].height = clamped;
      this.interaction.onPointDrag(this.draggingIndex, clamped);
      this.draw();
    } else {
      const idx = this.findNearestPoint(x, y);
      if (idx !== this.hoverIndex) {
        this.hoverIndex = idx;
        this.canvas.style.cursor = idx !== null ? 'pointer' : 'crosshair';
        this.draw();
      }
    }
  }

  private onMouseDown(e: MouseEvent) {
    const { x, y } = this.getMousePos(e);
    const idx = this.findNearestPoint(x, y);
    if (idx !== null) {
      this.draggingIndex = idx;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseUp() {
    this.draggingIndex = null;
    this.canvas.style.cursor = this.hoverIndex !== null ? 'pointer' : 'crosshair';
  }

  private onMouseLeave() {
    this.draggingIndex = null;
    this.hoverIndex = null;
    this.canvas.style.cursor = 'crosshair';
    this.draw();
  }

  public setSamples(samples: SamplePoint[]) {
    this.samples = samples;
    this.hoverIndex = null;
    this.draggingIndex = null;
    this.draw();
  }

  public getSamples(): SamplePoint[] {
    return this.samples;
  }

  public exportData(): string {
    return JSON.stringify(
      this.samples.map(s => ({ distance: s.distance, height: s.height, x: s.x, z: s.z })),
      null,
      2
    );
  }

  private drawGrid() {
    const chart = this.getChartRect();
    const range = this.getDataRange();
    const ctx = this.ctx;

    ctx.strokeStyle = 'rgba(136, 146, 176, 0.2)';
    ctx.lineWidth = 1;

    const distStep = this.niceStep((range.maxDist - range.minDist) / 8);
    ctx.beginPath();
    for (let d = Math.ceil(range.minDist / distStep) * distStep; d <= range.maxDist; d += distStep) {
      const x = this.distanceToX(d);
      ctx.moveTo(x, chart.y);
      ctx.lineTo(x, chart.y + chart.h);
    }
    ctx.stroke();

    const heightStep = this.niceStep((range.maxHeight - range.minHeight) / 6);
    ctx.beginPath();
    for (let h = Math.ceil(range.minHeight / heightStep) * heightStep; h <= range.maxHeight; h += heightStep) {
      const y = this.heightToY(h);
      ctx.moveTo(chart.x, y);
      ctx.lineTo(chart.x + chart.w, y);
    }
    ctx.stroke();
  }

  private niceStep(roughStep: number): number {
    const pow = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const norm = roughStep / pow;
    let nice: number;
    if (norm <= 1.5) nice = 1;
    else if (norm <= 3) nice = 2;
    else if (norm <= 7) nice = 5;
    else nice = 10;
    return nice * pow;
  }

  private drawAxes() {
    const chart = this.getChartRect();
    const range = this.getDataRange();
    const ctx = this.ctx;

    ctx.strokeStyle = '#8892b0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chart.x, chart.y);
    ctx.lineTo(chart.x, chart.y + chart.h);
    ctx.lineTo(chart.x + chart.w, chart.y + chart.h);
    ctx.stroke();

    ctx.fillStyle = '#ccd6f6';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const heightStep = this.niceStep((range.maxHeight - range.minHeight) / 6);
    for (let h = Math.ceil(range.minHeight / heightStep) * heightStep; h <= range.maxHeight; h += heightStep) {
      const y = this.heightToY(h);
      ctx.fillText(h.toFixed(1), chart.x - 8, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const distStep = this.niceStep((range.maxDist - range.minDist) / 8);
    for (let d = Math.ceil(range.minDist / distStep) * distStep; d <= range.maxDist; d += distStep) {
      const x = this.distanceToX(d);
      ctx.fillText(d.toFixed(1), x, chart.y + chart.h + 8);
    }

    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('距离 (单位)', chart.x + chart.w / 2, chart.y + chart.h + 32);

    ctx.save();
    ctx.translate(12, chart.y + chart.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('高度 (单位)', 0, 0);
    ctx.restore();
  }

  private drawWaveform() {
    if (this.samples.length < 2) return;

    const ctx = this.ctx;
    const chart = this.getChartRect();

    ctx.save();
    ctx.beginPath();
    ctx.rect(chart.x, chart.y, chart.w, chart.h);
    ctx.clip();

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const gradient = ctx.createLinearGradient(chart.x, 0, chart.x + chart.w, 0);
    gradient.addColorStop(0, '#2196f3');
    gradient.addColorStop(0.5, '#64b5f6');
    gradient.addColorStop(1, '#2196f3');
    ctx.strokeStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(this.distanceToX(this.samples[0].distance), this.heightToY(this.samples[0].height));
    for (let i = 1; i < this.samples.length; i++) {
      const px = this.distanceToX(this.samples[i].distance);
      const py = this.heightToY(this.samples[i].height);
      const prevX = this.distanceToX(this.samples[i - 1].distance);
      const prevY = this.heightToY(this.samples[i - 1].height);
      const cpx = (prevX + px) / 2;
      ctx.quadraticCurveTo(prevX, prevY, cpx, (prevY + py) / 2);
    }
    const last = this.samples[this.samples.length - 1];
    ctx.lineTo(this.distanceToX(last.distance), this.heightToY(last.height));
    ctx.stroke();
    ctx.restore();
  }

  private drawPoints() {
    const ctx = this.ctx;
    for (let i = 0; i < this.samples.length; i++) {
      const px = this.distanceToX(this.samples[i].distance);
      const py = this.heightToY(this.samples[i].height);
      const isHover = i === this.hoverIndex || i === this.draggingIndex;
      const radius = isHover ? 7 : 5;

      ctx.beginPath();
      ctx.arc(px, py, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(233, 69, 96, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = isHover ? '#e94560' : '#2196f3';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  public draw() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    this.ctx.fillStyle = '#0f3460';
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    this.drawGrid();
    this.drawAxes();
    this.drawWaveform();
    this.drawPoints();

    if (this.samples.length === 0) {
      const ctx = this.ctx;
      ctx.fillStyle = '#8892b0';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('按住 Ctrl 键在左侧地形上拖拽绘制剖面线', rect.width / 2, rect.height / 2);
    }
  }
}
