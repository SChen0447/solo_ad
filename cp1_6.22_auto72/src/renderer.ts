import { EventStore } from './store';

const CELL_SIZE = 12;
const CELL_GAP = 2;
const TOTAL_MONTHS = 24;
const MONTH_LABEL_WIDTH = 40;
const DAY_LABEL_HEIGHT = 20;
const MAX_DAYS_IN_MONTH = 31;

interface ColorStop {
  count: number;
  color: string;
}

const COLOR_STOPS: ColorStop[] = [
  { count: 0, color: '#0f0f23' },
  { count: 1, color: '#1a1a4e' },
  { count: 2, color: '#5c1a8a' },
  { count: 3, color: '#c41e8a' },
  { count: 5, color: '#ff2a6d' }
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getColorForEventCount(count: number): string {
  if (count <= COLOR_STOPS[0].count) {
    return COLOR_STOPS[0].color;
  }
  if (count >= COLOR_STOPS[COLOR_STOPS.length - 1].count) {
    return COLOR_STOPS[COLOR_STOPS.length - 1].color;
  }

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const lower = COLOR_STOPS[i];
    const upper = COLOR_STOPS[i + 1];
    if (count >= lower.count && count <= upper.count) {
      const t = (count - lower.count) / (upper.count - lower.count);
      return lerpColor(lower.color, upper.color, t);
    }
  }

  return COLOR_STOPS[0].color;
}

interface HoverInfo {
  date: string;
  eventCount: number;
  screenX: number;
  screenY: number;
}

interface PulseCell {
  date: string;
  startTime: number;
  duration: number;
}

interface MonthInfo {
  year: number;
  month: number;
  days: number;
  label: string;
  yearLabel: string;
  showYear: boolean;
}

export class RiverRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private store: EventStore;
  private container: HTMLElement;

  private scrollX: number = 0;
  private months: MonthInfo[] = [];
  private centerMonthIndex: number = 0;

  private hoverInfo: HoverInfo | null = null;
  private pulseCells: PulseCell[] = [];
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartScroll: number = 0;
  private dragMoved: boolean = false;

  private animationFrameId: number = 0;
  private onMonthChange: ((month: Date) => void) | null = null;
  private onCellClick: ((date: string) => void) | null = null;

  private noisePattern: CanvasPattern | null = null;

  constructor(canvas: HTMLCanvasElement, store: EventStore, container: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.store = store;
    this.container = container;

    this.generateMonths();
    this.generateNoisePattern();
    this.setupEventListeners();
    this.resize();
    this.centerOnMonthIndex(Math.floor(TOTAL_MONTHS / 2));
  }

  private generateMonths(): void {
    this.months = [];
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - Math.floor(TOTAL_MONTHS / 2), 1);

    let prevYear = -1;

    for (let i = 0; i < TOTAL_MONTHS; i++) {
      const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const label = date.toLocaleString('default', { month: 'short' }).toUpperCase();
      const showYear = year !== prevYear;

      this.months.push({
        year,
        month,
        days,
        label,
        yearLabel: String(year),
        showYear
      });

      prevYear = year;
    }
  }

  private generateNoisePattern(): void {
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 100;
    noiseCanvas.height = 100;
    const noiseCtx = noiseCanvas.getContext('2d')!;
    const imageData = noiseCtx.createImageData(100, 100);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 20;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 30;
    }

    noiseCtx.putImageData(imageData, 0, 0);
    this.noisePattern = this.ctx.createPattern(noiseCanvas, 'repeat');
  }

  setOnMonthChange(callback: (month: Date) => void): void {
    this.onMonthChange = callback;
  }

  setOnCellClick(callback: (date: string) => void): void {
    this.onCellClick = callback;
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);

    this.render();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('mousemove', this.handleDocMouseMove.bind(this));
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const scrollAmount = e.deltaX !== 0 ? e.deltaX : e.deltaY;
    this.scrollX += scrollAmount;
    this.clampScroll();
    this.updateCenterMonth();
    this.render();
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartScroll = this.scrollX;
    this.canvas.style.cursor = 'grabbing';
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.canvas.style.cursor = 'grab';
  }

  private handleDocMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const delta = e.clientX - this.dragStartX;
    if (Math.abs(delta) > 3) {
      this.dragMoved = true;
    }
    this.scrollX = this.dragStartScroll - delta;
    this.clampScroll();
    this.updateCenterMonth();
    this.render();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellInfo = this.getCellAtPosition(x, y);
    if (cellInfo) {
      this.hoverInfo = {
        date: cellInfo.date,
        eventCount: this.store.getEventCountForDate(cellInfo.date),
        screenX: e.clientX - rect.left,
        screenY: e.clientY - rect.top
      };
    } else {
      this.hoverInfo = null;
    }

    this.render();
  }

  private handleMouseLeave(): void {
    this.hoverInfo = null;
    this.render();
  }

  private handleClick(e: MouseEvent): void {
    if (this.isDragging || this.dragMoved) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellInfo = this.getCellAtPosition(x, y);
    if (cellInfo && this.onCellClick) {
      this.onCellClick(cellInfo.date);
    }
  }

  private getCellAtPosition(
    x: number,
    y: number
  ): { date: string; monthIndex: number; dayIndex: number } | null {
    const startX = MONTH_LABEL_WIDTH;
    const startY = DAY_LABEL_HEIGHT;
    const cellWidth = CELL_SIZE + CELL_GAP;
    const cellHeight = CELL_SIZE + CELL_GAP;

    const adjustedX = x + this.scrollX - startX;
    const adjustedY = y - startY;

    const monthIndex = Math.floor(adjustedY / cellHeight);
    if (monthIndex < 0 || monthIndex >= this.months.length) return null;

    const monthInfo = this.months[monthIndex];
    const dayIndex = Math.floor(adjustedX / cellWidth);
    if (dayIndex < 0 || dayIndex >= monthInfo.days) return null;

    const date = this.getDateFromGrid(monthIndex, dayIndex);
    return {
      date: EventStore.formatDate(date),
      monthIndex,
      dayIndex
    };
  }

  private getDateFromGrid(monthIndex: number, dayIndex: number): Date {
    const monthInfo = this.months[monthIndex];
    return new Date(monthInfo.year, monthInfo.month, dayIndex + 1);
  }

  private clampScroll(): void {
    const totalWidth = MAX_DAYS_IN_MONTH * (CELL_SIZE + CELL_GAP);
    const visibleWidth = this.canvas.offsetWidth - MONTH_LABEL_WIDTH;
    const maxScroll = Math.max(0, totalWidth - visibleWidth);
    this.scrollX = Math.max(0, Math.min(maxScroll, this.scrollX));
  }

  private updateCenterMonth(): void {
    const visibleHeight = this.canvas.offsetHeight - DAY_LABEL_HEIGHT;
    const centerY = visibleHeight / 2;
    const cellHeight = CELL_SIZE + CELL_GAP;
    const centerMonthIdx = Math.floor(centerY / cellHeight);

    if (centerMonthIdx !== this.centerMonthIndex && centerMonthIdx >= 0 && centerMonthIdx < this.months.length) {
      this.centerMonthIndex = centerMonthIdx;
      if (this.onMonthChange) {
        const monthInfo = this.months[centerMonthIdx];
        this.onMonthChange(new Date(monthInfo.year, monthInfo.month, 1));
      }
    }
  }

  centerOnMonth(month: Date): void {
    const targetYear = month.getFullYear();
    const targetMonth = month.getMonth();

    let closestIndex = 0;
    let closestDiff = Infinity;

    for (let i = 0; i < this.months.length; i++) {
      const m = this.months[i];
      const diff = Math.abs(m.year * 12 + m.month - (targetYear * 12 + targetMonth));
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    this.centerOnMonthIndex(closestIndex);
  }

  private centerOnMonthIndex(index: number): void {
    this.centerMonthIndex = Math.max(0, Math.min(this.months.length - 1, index));

    if (this.onMonthChange) {
      const monthInfo = this.months[this.centerMonthIndex];
      this.onMonthChange(new Date(monthInfo.year, monthInfo.month, 1));
    }

    this.render();
  }

  pulseCell(date: string): void {
    this.pulseCells.push({
      date,
      startTime: performance.now(),
      duration: 300
    });

    if (!this.animationFrameId) {
      this.animate();
    }
  }

  private animate(): void {
    const now = performance.now();
    this.pulseCells = this.pulseCells.filter(
      (p) => now - p.startTime < p.duration
    );

    this.render();

    if (this.pulseCells.length > 0) {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationFrameId = 0;
    }
  }

  render(): void {
    const ctx = this.ctx;
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    if (this.noisePattern) {
      ctx.fillStyle = this.noisePattern;
      ctx.fillRect(0, 0, width, height);
    }

    const startX = MONTH_LABEL_WIDTH;
    const startY = DAY_LABEL_HEIGHT;
    const cellWidth = CELL_SIZE + CELL_GAP;
    const cellHeight = CELL_SIZE + CELL_GAP;

    this.drawDayLabels(ctx, startX, startY, cellWidth);

    for (let monthIdx = 0; monthIdx < this.months.length; monthIdx++) {
      const month = this.months[monthIdx];
      const y = startY + monthIdx * cellHeight;

      if (y + cellHeight < 0 || y > height) continue;

      this.drawMonthLabel(ctx, month, y);
      this.drawMonthCells(ctx, month, monthIdx, y, startX, cellWidth, cellHeight);
    }
  }

  private drawDayLabels(ctx: CanvasRenderingContext2D, startX: number, startY: number, cellWidth: number): void {
    ctx.fillStyle = '#00d4ff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textBaseline = 'top';

    for (let day = 0; day < MAX_DAYS_IN_MONTH; day++) {
      const x = startX + day * cellWidth - this.scrollX;
      if (x < -20 || x > this.canvas.offsetWidth + 20) continue;

      if ((day + 1) % 5 === 0 || day === 0) {
        ctx.fillText(String(day + 1), x + 1, startY - 16);
      }
    }
  }

  private drawMonthLabel(ctx: CanvasRenderingContext2D, month: MonthInfo, y: number): void {
    ctx.textBaseline = 'top';
    ctx.font = '8px "Press Start 2P", monospace';

    if (month.showYear) {
      ctx.fillStyle = '#ff2a6d';
      ctx.fillText(month.yearLabel, 4, y + 2);
    }

    ctx.fillStyle = '#39ff14';
    ctx.fillText(month.label, 4, y + 2 + 12);
  }

  private drawMonthCells(
    ctx: CanvasRenderingContext2D,
    month: MonthInfo,
    monthIdx: number,
    y: number,
    startX: number,
    cellWidth: number,
    cellHeight: number
  ): void {
    for (let dayIdx = 0; dayIdx < month.days; dayIdx++) {
      const x = startX + dayIdx * cellWidth - this.scrollX;

      if (x + CELL_SIZE < 0 || x > this.canvas.offsetWidth) continue;

      const date = new Date(month.year, month.month, dayIdx + 1);
      const dateStr = EventStore.formatDate(date);
      const eventCount = this.store.getEventCountForDate(dateStr);
      const color = getColorForEventCount(eventCount);

      const pulse = this.pulseCells.find((p) => p.date === dateStr);
      let scale = 1;
      if (pulse) {
        const t = (performance.now() - pulse.startTime) / pulse.duration;
        scale = 1 + 0.2 * Math.sin(t * Math.PI);
      }

      const isHovered = this.hoverInfo && this.hoverInfo.date === dateStr;
      if (isHovered) {
        scale = 2;
      }

      if (scale > 1) {
        const scaledSize = CELL_SIZE * scale;
        const offset = (scaledSize - CELL_SIZE) / 2;
        ctx.fillStyle = color;
        ctx.fillRect(x - offset, y - offset, scaledSize, scaledSize);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }

      if (this.isToday(date)) {
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, y - 0.5, CELL_SIZE + 1, CELL_SIZE + 1);
      }
    }
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  getTooltipInfo(): HoverInfo | null {
    return this.hoverInfo;
  }

  refresh(): void {
    this.render();
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('mousemove', this.handleDocMouseMove.bind(this));
  }
}
