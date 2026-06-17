import {
  Organism,
  Food,
  ORGANISM_SIZE,
  FOOD_RADIUS,
  SCENE_WIDTH,
  SCENE_HEIGHT,
  rgbToString,
} from './entities';
import { PopulationSample, SimulationStats } from './simulation';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private chartCtx: CanvasRenderingContext2D;
  readonly CHART_WIDTH = 200;
  readonly CHART_HEIGHT = 150;
  private readonly BORDER_WIDTH = 8;

  constructor(sceneCanvas: HTMLCanvasElement, chartCanvas: HTMLCanvasElement) {
    const sceneCtx = sceneCanvas.getContext('2d');
    const chartCtx = chartCanvas.getContext('2d');
    if (!sceneCtx || !chartCtx) {
      throw new Error('Failed to get canvas contexts');
    }
    this.ctx = sceneCtx;
    this.chartCtx = chartCtx;
  }

  render(
    organisms: Organism[],
    foods: Food[],
    stats: SimulationStats,
    history: PopulationSample[]
  ): void {
    this.renderScene(organisms, foods);
    this.renderChart(history, stats);
  }

  private renderScene(organisms: Organism[], foods: Food[]): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    this.drawGrassBackground();
    this.drawWoodenBorder();
    this.drawFoods(foods);
    this.drawOrganisms(organisms);
  }

  private drawGrassBackground(): void {
    const ctx = this.ctx;
    const b = this.BORDER_WIDTH;
    const w = SCENE_WIDTH - b * 2;
    const h = SCENE_HEIGHT - b * 2;

    const grassGradient = ctx.createLinearGradient(b, b, b, b + h);
    grassGradient.addColorStop(0, '#3a6b3a');
    grassGradient.addColorStop(1, '#4a8a4a');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(b, b, w, h);

    ctx.strokeStyle = 'rgba(0, 80, 0, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = b; x <= SCENE_WIDTH - b; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, b);
      ctx.lineTo(x, SCENE_HEIGHT - b);
      ctx.stroke();
    }
    for (let y = b; y <= SCENE_HEIGHT - b; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(b, y);
      ctx.lineTo(SCENE_WIDTH - b, y);
      ctx.stroke();
    }
  }

  private drawWoodenBorder(): void {
    const ctx = this.ctx;
    const b = this.BORDER_WIDTH;

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, SCENE_WIDTH, b);
    ctx.fillRect(0, SCENE_HEIGHT - b, SCENE_WIDTH, b);
    ctx.fillRect(0, 0, b, SCENE_HEIGHT);
    ctx.fillRect(SCENE_WIDTH - b, 0, b, SCENE_HEIGHT);

    ctx.strokeStyle = '#1b0f0d';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.strokeRect(i, i, SCENE_WIDTH - i * 2, SCENE_HEIGHT - i * 2);
    }
  }

  private drawFoods(foods: Food[]): void {
    const ctx = this.ctx;

    for (const food of foods) {
      const gradient = ctx.createRadialGradient(
        food.x - FOOD_RADIUS * 0.3,
        food.y - FOOD_RADIUS * 0.3,
        1,
        food.x,
        food.y,
        FOOD_RADIUS
      );
      gradient.addColorStop(0, '#ff8a80');
      gradient.addColorStop(0.5, '#ef4444');
      gradient.addColorStop(1, '#b91c1c');

      ctx.beginPath();
      ctx.arc(food.x, food.y, FOOD_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(food.x - FOOD_RADIUS * 0.3, food.y - FOOD_RADIUS * 0.3, FOOD_RADIUS * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    }
  }

  private drawOrganisms(organisms: Organism[]): void {
    const ctx = this.ctx;

    for (const org of organisms) {
      const halfSize = ORGANISM_SIZE / 2;
      const x = org.x - halfSize;
      const y = org.y - halfSize;

      ctx.shadowColor = rgbToString(org.colorRGB, 0.6);
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = rgbToString(org.colorRGB, 1);
      ctx.fillRect(x, y, ORGANISM_SIZE, ORGANISM_SIZE);

      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, ORGANISM_SIZE - 1, ORGANISM_SIZE - 1);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(x + 2, y + 2, ORGANISM_SIZE - 10, 3);
    }
  }

  private renderChart(history: PopulationSample[], stats: SimulationStats): void {
    const ctx = this.chartCtx;
    const w = this.CHART_WIDTH;
    const h = this.CHART_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, 0, 0, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 6);
    ctx.stroke();

    const padding = { top: 20, right: 10, bottom: 18, left: 24 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('种群动态 (60s窗口)', w / 2, 13);

    const maxFromHistory = history.reduce(
      (m, p) => Math.max(m, p.red, p.blue, p.green),
      0
    );
    const rawMax = Math.max(maxFromHistory, stats.redCount, stats.blueCount, stats.greenCount, 5);
    const maxY = Math.max(5, Math.ceil(rawMax / 5) * 5);
    const ySteps = 5;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '9px sans-serif';

    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartH / ySteps) * i;
      const value = Math.round(maxY - (maxY / ySteps) * i);
      ctx.fillText(String(value), padding.left - 4, y);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    const xLabelY = h - 5;
    ctx.fillStyle = '#888';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '9px sans-serif';
    ctx.fillText('0', padding.left, xLabelY);
    ctx.textAlign = 'right';
    ctx.fillText('-60s', w - padding.right, xLabelY);

    const currentTime = stats.elapsedTime;
    const windowStart = Math.max(0, currentTime - 60);
    const windowEnd = currentTime;
    const windowSpan = Math.max(1, windowEnd - windowStart);

    const getX = (time: number): number => {
      const t = Math.max(0, Math.min(1, (time - windowStart) / windowSpan));
      return padding.left + chartW * t;
    };
    const getY = (count: number): number => {
      const v = Math.min(maxY, count) / maxY;
      return padding.top + chartH * (1 - v);
    };

    const visibleHistory = history.filter((p) => p.time >= windowStart - 1);

    this.drawLine(ctx, visibleHistory, 'red', getX, getY);
    this.drawLine(ctx, visibleHistory, 'blue', getX, getY);
    this.drawLine(ctx, visibleHistory, 'green', getX, getY);

    const legendX = padding.left + chartW / 2 - 35;
    const legendY = padding.top + 4;
    this.drawLegend(ctx, legendX, legendY, stats);
  }

  private drawLine(
    ctx: CanvasRenderingContext2D,
    history: PopulationSample[],
    color: 'red' | 'blue' | 'green',
    getX: (t: number) => number,
    getY: (v: number) => number
  ): void {
    if (history.length === 0) return;

    const colors: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
    };

    ctx.strokeStyle = colors[color];
    ctx.fillStyle = colors[color];
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (history.length === 1) {
      const p = history[0];
      const x = getX(p.time);
      const y = getY(p[color]);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    let started = false;
    for (const point of history) {
      const x = getX(point.time);
      const y = getY(point[color]);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private drawLegend(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    stats: SimulationStats
  ): void {
    const items = [
      { label: '红', color: '#ef4444', count: stats.redCount },
      { label: '蓝', color: '#3b82f6', count: stats.blueCount },
      { label: '绿', color: '#22c55e', count: stats.greenCount },
    ];

    let offsetX = x;
    ctx.font = '9px sans-serif';
    ctx.textBaseline = 'middle';

    for (const item of items) {
      ctx.fillStyle = item.color;
      ctx.fillRect(offsetX, y, 8, 8);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.label}:${item.count}`, offsetX + 10, y + 4);
      offsetX += 32;
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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
