import * as d3 from 'd3';
import { ColorTheme } from '@/core/CityGenerator';

export interface StatsData {
  count: number;
  maxHeight: number;
  avgHeight: number;
  heightDistribution: number[];
}

const THEME_CHART_COLORS: Record<ColorTheme, string[]> = {
  sunset: ['#8B4513', '#CD853F', '#D2691E', '#FF8C00', '#FFD700'],
  cyberpunk: ['#FF00FF', '#8A2BE2', '#9932CC', '#00FFFF', '#00CED1'],
  ice: ['#E0FFFF', '#B0E0E6', '#87CEEB', '#6495ED', '#4682B4']
};

const BIN_LABELS = ['5-20', '20-35', '35-50', '50-65', '65-80'];

export class StatsPanel {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private data: StatsData;
  private currentTheme: ColorTheme = 'sunset';

  private readonly chartWidth: number = 188;
  private readonly chartHeight: number = 70;
  private readonly barWidth: number = 40;
  private readonly barPadding: number = 4;
  private readonly margin: { top: number; right: number; bottom: number; left: number } = { top: 5, right: 5, bottom: 20, left: 20 };

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = d3.select(el);
    this.data = { count: 0, maxHeight: 0, avgHeight: 0, heightDistribution: [0, 0, 0, 0, 0] };
    this.render();
  }

  private render(): void {
    this.container.html('');

    this.container.append('div')
      .attr('class', 'panel-title')
      .style('margin-bottom', '8px')
      .text('城市统计');

    const statsDiv = this.container.append('div')
      .style('margin-bottom', '6px');

    statsDiv.append('div')
      .attr('class', 'stats-row')
      .html(`<span class="stats-label">建筑总数:</span><span class="stats-number" id="stat-count">0</span>`);

    statsDiv.append('div')
      .attr('class', 'stats-row')
      .html(`<span class="stats-label">最高建筑:</span><span class="stats-number" id="stat-max">0</span>`);

    statsDiv.append('div')
      .attr('class', 'stats-row')
      .html(`<span class="stats-label">平均高度:</span><span class="stats-number" id="stat-avg">0</span>`);

    const chartContainer = this.container.append('div')
      .attr('class', 'chart-container');

    this.svg = chartContainer.append('svg')
      .attr('width', this.chartWidth)
      .attr('height', this.chartHeight);

    this.renderChart();
  }

  private renderChart(): void {
    if (!this.svg) return;

    this.svg.selectAll('*').remove();

    const innerWidth = this.chartWidth - this.margin.left - this.margin.right;
    const innerHeight = this.chartHeight - this.margin.top - this.margin.bottom;

    const g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    const distribution = this.data.heightDistribution;
    const maxValue = Math.max(1, ...distribution);

    const xScale = d3.scaleBand<number>()
      .domain(distribution.map((_, i) => i))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0]);

    const colors = THEME_CHART_COLORS[this.currentTheme];

    const bars = g.selectAll('.bar')
      .data(distribution)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (_, i) => (xScale(i) || 0) + (xScale.bandwidth() - this.barWidth) / 2)
      .attr('y', innerHeight)
      .attr('width', this.barWidth)
      .attr('height', 0)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', (_, i) => colors[i % colors.length])
      .attr('opacity', 0.85)
      .style('transition', 'all 0.6s ease-out');

    bars.transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr('y', d => yScale(d))
      .attr('height', d => innerHeight - yScale(d));

    g.selectAll('.bar-label')
      .data(distribution)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (_, i) => (xScale(i) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d, i) => yScale(d) - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#AAAAAA')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .style('opacity', 0)
      .text(d => d > 0 ? d.toString() : '')
      .transition()
      .delay(400)
      .duration(300)
      .style('opacity', 1);

    g.selectAll('.x-label')
      .data(BIN_LABELS)
      .enter()
      .append('text')
      .attr('class', 'x-label')
      .attr('x', (_, i) => (xScale(i) || 0) + xScale.bandwidth() / 2)
      .attr('y', innerHeight + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#666666')
      .attr('font-size', '9px');
  }

  public update(data: StatsData): void {
    this.data = { ...data, heightDistribution: [...data.heightDistribution] };

    const countEl = document.getElementById('stat-count');
    const maxEl = document.getElementById('stat-max');
    const avgEl = document.getElementById('stat-avg');

    if (countEl) this.animateNumber(countEl, data.count, 0);
    if (maxEl) this.animateNumber(maxEl, data.maxHeight, 1);
    if (avgEl) this.animateNumber(avgEl, data.avgHeight, 1);

    this.renderChart();
  }

  private animateNumber(element: HTMLElement, targetValue: number, decimals: number): void {
    const startValue = parseFloat(element.textContent || '0') || 0;
    const duration = 500;
    const startTime = performance.now();
    const factor = Math.pow(10, decimals);

    const tick = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValue + (targetValue - startValue) * eased;
      element.textContent = (Math.round(value * factor) / factor).toString();

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }

  public setTheme(theme: ColorTheme): void {
    if (theme === this.currentTheme) return;
    this.currentTheme = theme;

    const panel = document.getElementById('stats-panel');
    if (panel) {
      panel.style.transition = 'background 0.8s ease-in-out';
    }

    this.renderChart();
  }

  public getTheme(): ColorTheme {
    return this.currentTheme;
  }
}
