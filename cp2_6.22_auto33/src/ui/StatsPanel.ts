import * as d3 from 'd3';
import { BuildingData } from '@/core/CityGenerator';

type Theme = 'sunset' | 'cyberpunk' | 'ice';

export class StatsPanel {
  private containerId: string;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private panel: d3.Selection<HTMLDivElement, unknown, null, undefined>;
  private barGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private currentTheme: Theme = 'cyberpunk';

  private readonly panelWidth = 220;
  private readonly panelHeight = 180;
  private readonly chartWidth = 196;
  private readonly chartHeight = 80;
  private readonly barWidth = 32;
  private readonly barGap = 9;

  private readonly themeColors: Record<Theme, string> = {
    sunset: '#FF6B35',
    cyberpunk: '#00BFFF',
    ice: '#87CEEB',
  };

  constructor(containerId: string) {
    this.containerId = containerId;
    this.injectStyles();
    this.createPanel();
  }

  private injectStyles(): void {
    const styleId = 'stats-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .stats-panel {
        position: fixed;
        bottom: 16px;
        right: 16px;
        width: 220px;
        height: 180px;
        padding: 12px;
        background: rgba(20, 20, 30, 0.85);
        border-radius: 12px;
        color: #CCCCCC;
        font-size: 12px;
        font-family: sans-serif;
        box-sizing: border-box;
        z-index: 1000;
      }
      .stats-panel-title {
        font-size: 14px;
        font-weight: bold;
        color: #FFFFFF;
        margin-bottom: 8px;
      }
      .stats-row {
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
      }
      .stats-value {
        color: #00BFFF;
        font-family: monospace;
      }
      .stats-chart {
        margin-top: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Container with id '${this.containerId}' not found`);
    }

    this.panel = d3
      .select(container)
      .append('div')
      .attr('class', 'stats-panel');

    this.panel.append('div').attr('class', 'stats-panel-title').text('城市统计');

    this.panel
      .append('div')
      .attr('class', 'stats-row')
      .html(
        '<span>Buildings</span><span class="stats-value" id="stats-buildings">0</span>'
      );

    this.panel
      .append('div')
      .attr('class', 'stats-row')
      .html(
        '<span>Max Height</span><span class="stats-value" id="stats-max-height">0.0</span>'
      );

    this.panel
      .append('div')
      .attr('class', 'stats-row')
      .html(
        '<span>Avg Height</span><span class="stats-value" id="stats-avg-height">0.0</span>'
      );

    this.svg = this.panel
      .append('div')
      .attr('class', 'stats-chart')
      .append('svg')
      .attr('width', this.chartWidth)
      .attr('height', this.chartHeight);

    this.barGroup = this.svg.append('g');
  }

  update(buildings: BuildingData[]): void {
    const count = buildings.length;
    const heights = buildings.map((b) => b.height);
    const maxHeight = count > 0 ? Math.max(...heights) : 0;
    const avgHeight = count > 0 ? heights.reduce((a, b) => a + b, 0) / count : 0;

    document.getElementById('stats-buildings')!.textContent = String(count);
    document.getElementById('stats-max-height')!.textContent =
      maxHeight.toFixed(1);
    document.getElementById('stats-avg-height')!.textContent =
      avgHeight.toFixed(1);

    const binCount = 5;
    const bins: { max: number; count: number }[] = [];

    if (count === 0) {
      for (let i = 0; i < binCount; i++) {
        bins.push({ max: 0, count: 0 });
      }
    } else {
      const minHeight = Math.min(...heights);
      const range = maxHeight - minHeight;
      const step = range / binCount;

      for (let i = 0; i < binCount; i++) {
        const binMax = i === binCount - 1 ? maxHeight : minHeight + (i + 1) * step;
        const binMin = i === 0 ? minHeight : minHeight + i * step;
        const binCountVal = heights.filter(
          (h) => (i === 0 ? h >= binMin && h <= binMax : h > binMin && h <= binMax)
        ).length;
        bins.push({ max: binMax, count: binCountVal });
      }
    }

    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(d3.max(bins, (d) => d.count) || 0, 1)])
      .range([this.chartHeight - 15, 5]);

    const color = this.themeColors[this.currentTheme];

    const bars = this.barGroup.selectAll('rect.bar').data(bins);

    bars
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (_d, i) => i * (this.barWidth + this.barGap))
      .attr('width', this.barWidth)
      .attr('y', yScale(0))
      .attr('height', 0)
      .attr('rx', 2)
      .attr('fill', color)
      .merge(bars as any)
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr('x', (_d, i) => i * (this.barWidth + this.barGap))
      .attr('width', this.barWidth)
      .attr('y', (d) => yScale(d.count))
      .attr('height', (d) => yScale(0) - yScale(d.count))
      .attr('fill', color);

    bars.exit().remove();

    const labels = this.barGroup.selectAll('text.bin-label').data(bins);

    labels
      .enter()
      .append('text')
      .attr('class', 'bin-label')
      .attr('x', (_d, i) => i * (this.barWidth + this.barGap) + this.barWidth / 2)
      .attr('y', this.chartHeight - 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#888')
      .merge(labels as any)
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr('x', (_d, i) => i * (this.barWidth + this.barGap) + this.barWidth / 2)
      .text((d) => d.max.toFixed(0));

    labels.exit().remove();
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    const color = this.themeColors[theme];

    this.barGroup
      .selectAll<SVGRectElement, unknown>('rect.bar')
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr('fill', color);
  }
}
