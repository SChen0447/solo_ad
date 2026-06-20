import * as THREE from 'three';
import * as d3 from 'd3';

export interface GridCellData {
  temperature: number;
  history: { time: string; temperature: number }[];
}

export type TimePeriod = 'morning' | 'noon' | 'evening';

export class HeatmapManager {
  private gridSize: number = 20;
  private currentPeriod: TimePeriod = 'noon';
  private data: GridCellData[][] = [];
  private allPeriodData: Record<TimePeriod, GridCellData[][]> = {
    morning: [],
    noon: [],
    evening: []
  };
  private colorScale: d3.ScaleLinear<string, string>;
  private infoPanel: HTMLDivElement | null = null;
  private detailTimeout: number | null = null;

  constructor() {
    this.colorScale = d3.scaleLinear<string, string>()
      .domain([20, 32.5, 45])
      .range(['#0D47A1', '#FFEB3B', '#D32F2F'])
      .interpolate(d3.interpolateRgb);

    this.generateAllPeriodData();
    this.data = this.allPeriodData.noon;
  }

  private generateAllPeriodData(): void {
    const baseData: number[][] = [];
    for (let row = 0; row < this.gridSize; row++) {
      baseData[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const centerDist = Math.sqrt(
          Math.pow(row - this.gridSize / 2, 2) + 
          Math.pow(col - this.gridSize / 2, 2)
        );
        const heatFactor = 1 - centerDist / (this.gridSize * 0.7);
        baseData[row][col] = Math.max(0, heatFactor);
      }
    }

    this.allPeriodData.morning = this.generatePeriodData(20, 30, baseData);
    this.allPeriodData.noon = this.generatePeriodData(30, 45, baseData);
    this.allPeriodData.evening = this.generatePeriodData(25, 35, baseData);
  }

  private generatePeriodData(
    minTemp: number, 
    maxTemp: number, 
    baseHeat: number[][]
  ): GridCellData[][] {
    const result: GridCellData[][] = [];
    
    for (let row = 0; row < this.gridSize; row++) {
      result[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const randomVariation = (Math.random() - 0.5) * 0.3;
        const heatValue = Math.max(0, Math.min(1, baseHeat[row][col] + randomVariation));
        const temperature = minTemp + heatValue * (maxTemp - minTemp);
        
        const history = this.generateHistory(row, col, temperature);
        
        result[row][col] = {
          temperature,
          history
        };
      }
    }
    
    return result;
  }

  private generateHistory(
    row: number, 
    col: number, 
    _currentTemp: number
  ): { time: string; temperature: number }[] {
    const seed = row * this.gridSize + col;
    const morningBase = 20 + (seed % 10);
    const noonBase = 30 + (seed % 15);
    const eveningBase = 25 + (seed % 10);
    
    const morningTemp = morningBase + (Math.sin(seed * 0.1) + 1) * 3;
    const noonTemp = noonBase + (Math.cos(seed * 0.15) + 1) * 5;
    const eveningTemp = eveningBase + (Math.sin(seed * 0.2) + 1) * 3;
    
    return [
      { time: '早', temperature: Math.round(morningTemp * 10) / 10 },
      { time: '中', temperature: Math.round(noonTemp * 10) / 10 },
      { time: '晚', temperature: Math.round(eveningTemp * 10) / 10 }
    ];
  }

  public getData(): GridCellData[][] {
    return this.data;
  }

  public getCurrentPeriod(): TimePeriod {
    return this.currentPeriod;
  }

  public switchTimePeriod(period: string): GridCellData[][] {
    const timePeriod = period as TimePeriod;
    if (this.allPeriodData[timePeriod]) {
      this.currentPeriod = timePeriod;
      this.data = this.allPeriodData[timePeriod];
    }
    return this.data;
  }

  public getColorForTemperature(temperature: number): THREE.Color {
    const colorString = this.colorScale(temperature);
    return new THREE.Color(colorString);
  }

  public getAverageTemperature(): number {
    let sum = 0;
    let count = 0;
    
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        sum += this.data[row][col].temperature;
        count++;
      }
    }
    
    return Math.round((sum / count) * 10) / 10;
  }

  public getTemperatureLevel(temp: number): { label: string; color: string } {
    if (temp >= 40) {
      return { label: '酷热', color: '#D32F2F' };
    } else if (temp >= 35) {
      return { label: '炎热', color: '#FF5722' };
    } else if (temp >= 30) {
      return { label: '温暖', color: '#FF9800' };
    } else if (temp >= 25) {
      return { label: '舒适', color: '#4CAF50' };
    } else if (temp >= 20) {
      return { label: '凉爽', color: '#2196F3' };
    } else {
      return { label: '寒冷', color: '#3F51B5' };
    }
  }

  public showCellDetail(
    cellData: GridCellData, 
    row: number, 
    col: number, 
    regionId: string
  ): void {
    this.hideCellDetail();
    this.createInfoPanel();
    
    if (!this.infoPanel) return;

    const level = this.getTemperatureLevel(cellData.temperature);
    
    this.infoPanel.innerHTML = `
      <div class="detail-header">
        <h2>区域详情</h2>
        <span class="region-id">${regionId}</span>
      </div>
      <div class="temperature-display">
        <span class="temp-value" style="color: ${level.color}">${cellData.temperature.toFixed(1)}</span>
        <span class="temp-unit">°C</span>
      </div>
      <div class="temperature-level" style="color: ${level.color}">${level.label}</div>
      <div class="chart-container">
        <h3>温度趋势</h3>
        <svg id="trend-chart" width="280" height="120"></svg>
      </div>
      <div class="coordinates">
        网格位置: [${row}, ${col}]
      </div>
    `;

    this.infoPanel.classList.add('visible');
    
    this.drawTrendChart(cellData.history);
    
    this.detailTimeout = window.setTimeout(() => {
      this.hideCellDetail();
    }, 1500);
  }

  private createInfoPanel(): void {
    if (this.infoPanel) return;

    this.infoPanel = document.createElement('div');
    this.infoPanel.id = 'detail-panel';
    this.infoPanel.style.cssText = `
      position: fixed;
      left: 24px;
      top: 50%;
      transform: translateY(-50%) translateX(-120%);
      width: 320px;
      background: rgba(26, 26, 46, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 16px;
      padding: 24px;
      color: white;
      z-index: 100;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      opacity: 0;
      pointer-events: none;
    `;

    const style = document.createElement('style');
    style.textContent = `
      #detail-panel.visible {
        transform: translateY(-50%) translateX(0);
        opacity: 1;
      }
      #detail-panel .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      #detail-panel .detail-header h2 {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      #detail-panel .region-id {
        font-size: 14px;
        padding: 4px 12px;
        background: rgba(0, 210, 255, 0.15);
        border-radius: 20px;
        color: #00d2ff;
        font-weight: 500;
      }
      #detail-panel .temperature-display {
        display: flex;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      #detail-panel .temp-value {
        font-size: 48px;
        font-weight: 700;
        line-height: 1;
      }
      #detail-panel .temp-unit {
        font-size: 20px;
        margin-left: 4px;
        margin-top: 8px;
        color: rgba(255, 255, 255, 0.6);
      }
      #detail-panel .temperature-level {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 20px;
      }
      #detail-panel .chart-container h3 {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        margin: 0 0 12px 0;
        font-weight: 500;
      }
      #detail-panel .coordinates {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
      }
      #trend-chart {
        display: block;
        overflow: visible;
      }
      #trend-chart .axis-line {
        stroke: rgba(255, 255, 255, 0.2);
        stroke-width: 1;
      }
      #trend-chart .axis-text {
        fill: rgba(255, 255, 255, 0.5);
        font-size: 11px;
      }
      #trend-chart .trend-line {
        fill: none;
        stroke-width: 3;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #trend-chart .trend-area {
        opacity: 0.2;
      }
      #trend-chart .data-point {
        fill: white;
        stroke: rgba(255, 255, 255, 0.3);
        stroke-width: 2;
        cursor: pointer;
        transition: r 0.2s ease;
      }
      #trend-chart .data-point:hover {
        r: 6;
      }
      #trend-chart .tooltip {
        position: absolute;
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        font-size: 12px;
        border-radius: 4px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
    `;
    document.head.appendChild(style);
    
    this.infoPanel.addEventListener('mouseenter', () => {
      if (this.detailTimeout) {
        clearTimeout(this.detailTimeout);
        this.detailTimeout = null;
      }
    });
    
    this.infoPanel.addEventListener('mouseleave', () => {
      this.detailTimeout = window.setTimeout(() => {
        this.hideCellDetail();
      }, 1500);
    });
    
    document.body.appendChild(this.infoPanel);
  }

  private drawTrendChart(history: { time: string; temperature: number }[]): void {
    const svg = d3.select('#trend-chart');
    svg.selectAll('*').remove();

    const width = 280;
    const height = 120;
    const margin = { top: 15, right: 20, bottom: 25, left: 35 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scalePoint<string>()
      .domain(history.map(d => d.time))
      .range([0, chartWidth]);

    const minTemp = Math.min(...history.map(d => d.temperature)) - 2;
    const maxTemp = Math.max(...history.map(d => d.temperature)) + 2;

    const yScale = d3.scaleLinear()
      .domain([minTemp, maxTemp])
      .range([chartHeight, 0]);

    const gradientId = 'line-gradient';
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#00d2ff');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3a7bd5');

    const areaGradientId = 'area-gradient';
    const areaGradient = defs.append('linearGradient')
      .attr('id', areaGradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#00d2ff')
      .attr('stop-opacity', 0.4);

    areaGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#00d2ff')
      .attr('stop-opacity', 0);

    g.append('line')
      .attr('class', 'axis-line')
      .attr('x1', 0)
      .attr('y1', chartHeight)
      .attr('x2', chartWidth)
      .attr('y2', chartHeight);

    g.append('line')
      .attr('class', 'axis-line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', chartHeight);

    g.selectAll('.axis-text-x')
      .data(history)
      .enter()
      .append('text')
      .attr('class', 'axis-text axis-text-x')
      .attr('x', d => xScale(d.time) || 0)
      .attr('y', chartHeight + 18)
      .attr('text-anchor', 'middle')
      .text(d => d.time);

    const yTicks = yScale.ticks(4);
    g.selectAll('.axis-text-y')
      .data(yTicks)
      .enter()
      .append('text')
      .attr('class', 'axis-text axis-text-y')
      .attr('x', -8)
      .attr('y', d => yScale(d) + 4)
      .attr('text-anchor', 'end')
      .text(d => d.toFixed(0));

    const line = d3.line<{ time: string; temperature: number }>()
      .x(d => xScale(d.time) || 0)
      .y(d => yScale(d.temperature))
      .curve(d3.curveMonotoneX);

    const area = d3.area<{ time: string; temperature: number }>()
      .x(d => xScale(d.time) || 0)
      .y0(chartHeight)
      .y1(d => yScale(d.temperature))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .attr('class', 'trend-area')
      .attr('d', area(history) || '')
      .attr('fill', `url(#${areaGradientId})`);

    g.append('path')
      .attr('class', 'trend-line')
      .attr('d', line(history) || '')
      .attr('stroke', `url(#${gradientId})`);

    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('cssText', `
        position: absolute;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        font-size: 12px;
        border-radius: 6px;
        pointer-events: none;
        opacity: 0;
        z-index: 1000;
        backdrop-filter: blur(4px);
      `);

    g.selectAll('.data-point')
      .data(history)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.time) || 0)
      .attr('cy', d => yScale(d.temperature))
      .attr('r', 4)
      .on('mouseenter', function(_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6);
        tooltip
          .style('opacity', 1)
          .html(`${d.time}: ${d.temperature.toFixed(1)}°C`);
      })
      .on('mousemove', function(event) {
        tooltip
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 20}px`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);
        tooltip
          .style('opacity', 0);
      });
  }

  public hideCellDetail(): void {
    if (this.detailTimeout) {
      clearTimeout(this.detailTimeout);
      this.detailTimeout = null;
    }
    
    if (this.infoPanel) {
      this.infoPanel.classList.remove('visible');
      setTimeout(() => {
        d3.select('.chart-tooltip').remove();
      }, 300);
    }
  }

  public dispose(): void {
    this.hideCellDetail();
    if (this.infoPanel) {
      this.infoPanel.remove();
      this.infoPanel = null;
    }
  }
}
