import * as THREE from 'three';
import * as d3 from 'd3';
import { CityGrid, GridCell } from './cityGrid';

export type TimePeriod = 'morning' | 'noon' | 'evening';

export interface HeatmapCellData {
  row: number;
  col: number;
  temperature: number;
  regionId: string;
}

export interface TrendDataPoint {
  period: TimePeriod;
  label: string;
  temperature: number;
}

export class HeatmapManager {
  private cityGrid: CityGrid;
  private gridSize: number;
  private currentPeriod: TimePeriod = 'noon';

  private morningData: number[][] = [];
  private noonData: number[][] = [];
  private eveningData: number[][] = [];

  private colorScale: d3.ScaleSequential<string>;
  private minTemp = 20;
  private maxTemp = 45;
  private maxHeight = 0.3;
  private terrainHeight: number[][] = [];

  private isTransitioning = false;
  private transitionDuration = 1000;

  private infoPanel: HTMLElement | null = null;
  private chartContainer: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;

  private regionLabels: string[][] = [];

  constructor(cityGrid: CityGrid) {
    this.cityGrid = cityGrid;
    this.gridSize = cityGrid.getGridSize();

    this.colorScale = d3.scaleSequential<string>(d3.interpolateRdYlBu)
      .domain([this.maxTemp, this.minTemp]);

    this.generateRegionLabels();
    this.generateTerrainHeight();
    this.generateHeatmapData();
    this.initializeHeatmap();
  }

  private generateRegionLabels(): void {
    const letters = 'ABCDEFGHIJKLMNOPQRST';
    for (let row = 0; row < this.gridSize; row++) {
      this.regionLabels[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const letter = letters[Math.floor(row / 2) % letters.length];
        const num = (col + 1).toString().padStart(2, '0');
        this.regionLabels[row][col] = `${letter}-${num}`;
      }
    }
  }

  private generateTerrainHeight(): void {
    for (let row = 0; row < this.gridSize; row++) {
      this.terrainHeight[row] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const nx = col / this.gridSize;
        const ny = row / this.gridSize;

        let height = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let octave = 0; octave < 4; octave++) {
          const wave1 = Math.sin(nx * frequency * 2.5 + 0.3) * Math.cos(ny * frequency * 2.8 + 0.7);
          const wave2 = Math.sin(nx * frequency * 4.2 - ny * frequency * 3.1 + 1.5) * 0.6;
          const wave3 = Math.cos(nx * frequency * 1.8 + 2.1) * Math.sin(ny * frequency * 2.2 - 0.4) * 0.4;

          height += (wave1 + wave2 + wave3) * amplitude;
          maxValue += amplitude * 2.0;
          amplitude *= 0.5;
          frequency *= 2.0;
        }

        const normalizedHeight = (height / maxValue + 1) * 0.5;
        this.terrainHeight[row][col] = normalizedHeight;
      }
    }

    this.smoothTerrain();
  }

  private smoothTerrain(): void {
    const iterations = 2;
    for (let iter = 0; iter < iterations; iter++) {
      const smoothed: number[][] = [];
      for (let row = 0; row < this.gridSize; row++) {
        smoothed[row] = [];
        for (let col = 0; col < this.gridSize; col++) {
          let sum = 0;
          let count = 0;

          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = row + dr;
              const nc = col + dc;
              if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                const weight = (dr === 0 && dc === 0) ? 4 : 1;
                sum += this.terrainHeight[nr][nc] * weight;
                count += weight;
              }
            }
          }
          smoothed[row][col] = sum / count;
        }
      }
      this.terrainHeight = smoothed;
    }
  }

  private generateHeatmapData(): void {
    const noiseScale = 0.15;

    for (let row = 0; row < this.gridSize; row++) {
      this.morningData[row] = [];
      this.noonData[row] = [];
      this.eveningData[row] = [];

      for (let col = 0; col < this.gridSize; col++) {
        const distFromCenter = Math.sqrt(
          Math.pow(row - this.gridSize / 2, 2) +
          Math.pow(col - this.gridSize / 2, 2)
        ) / (this.gridSize / 2);

        const noise1 = this.noise(row * noiseScale, col * noiseScale, 1);
        const noise2 = this.noise(row * noiseScale * 0.5, col * noiseScale * 0.5, 3);
        const combinedNoise = (noise1 + noise2 * 0.5) / 1.5;

        const terrainBias = this.terrainHeight[row][col] * 0.25;
        const centerHeat = (1 - distFromCenter) * 0.4;
        const heatFactor = centerHeat + combinedNoise * 0.6 + terrainBias;

        const morningBase = 20 + heatFactor * 10;
        this.morningData[row][col] = morningBase + (Math.random() - 0.5) * 2;

        const noonBase = 30 + heatFactor * 15;
        this.noonData[row][col] = noonBase + (Math.random() - 0.5) * 3;

        const eveningBase = 25 + heatFactor * 10;
        this.eveningData[row][col] = eveningBase + (Math.random() - 0.5) * 2.5;
      }
    }
  }

  private noise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  private getDataForPeriod(period: TimePeriod): number[][] {
    switch (period) {
      case 'morning':
        return this.morningData;
      case 'noon':
        return this.noonData;
      case 'evening':
        return this.eveningData;
      default:
        return this.noonData;
    }
  }

  private getTemperature(period: TimePeriod, row: number, col: number): number {
    const data = this.getDataForPeriod(period);
    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      return data[row][col];
    }
    return 0;
  }

  private getColor(temperature: number): THREE.Color {
    const colorStr = this.colorScale(temperature);
    return new THREE.Color(colorStr);
  }

  private getHeight(temperature: number, row: number, col: number): number {
    const tempNormalized = (temperature - this.minTemp) / (this.maxTemp - this.minTemp);
    const terrainBase = this.terrainHeight[row][col] * this.maxHeight * 0.7;
    const tempHeight = tempNormalized * this.maxHeight * 0.3;
    return terrainBase + tempHeight;
  }

  private initializeHeatmap(): void {
    const data = this.getDataForPeriod(this.currentPeriod);

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const temp = data[row][col];
        const color = this.getColor(temp);
        const height = this.getHeight(temp, row, col);
        this.cityGrid.setCellData(row, col, color, height);
      }
    }
  }

  public setTimePeriod(period: TimePeriod): void {
    if (this.isTransitioning || period === this.currentPeriod) return;

    this.isTransitioning = true;
    const oldData = this.getDataForPeriod(this.currentPeriod);
    const newData = this.getDataForPeriod(period);
    const startTime = performance.now();

    this.currentPeriod = period;

    const animateTransition = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / this.transitionDuration, 1);
      const easedProgress = this.easeInOutCubic(progress);

      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          const oldTemp = oldData[row][col];
          const newTemp = newData[row][col];
          const currentTemp = oldTemp + (newTemp - oldTemp) * easedProgress;

          const color = this.getColor(currentTemp);
          const height = this.getHeight(currentTemp, row, col);

          this.cityGrid.setCellData(row, col, color, height);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        this.isTransitioning = false;
      }
    };

    animateTransition();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getCurrentPeriod(): TimePeriod {
    return this.currentPeriod;
  }

  public getAverageTemperature(period: TimePeriod = this.currentPeriod): number {
    const data = this.getDataForPeriod(period);
    let sum = 0;
    let count = 0;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        sum += data[row][col];
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  public getCellData(row: number, col: number): HeatmapCellData | null {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return null;
    }

    return {
      row,
      col,
      temperature: this.getTemperature(this.currentPeriod, row, col),
      regionId: this.regionLabels[row][col]
    };
  }

  public getTrendData(row: number, col: number): TrendDataPoint[] {
    return [
      { period: 'morning', label: '早晨', temperature: this.getTemperature('morning', row, col) },
      { period: 'noon', label: '中午', temperature: this.getTemperature('noon', row, col) },
      { period: 'evening', label: '傍晚', temperature: this.getTemperature('evening', row, col) }
    ];
  }

  public getTemperatureLevel(temperature: number): { label: string; color: string; bgColor: string } {
    if (temperature < 22) {
      return { label: '凉爽', color: '#4FC3F7', bgColor: 'rgba(79, 195, 247, 0.15)' };
    } else if (temperature < 28) {
      return { label: '舒适', color: '#81C784', bgColor: 'rgba(129, 199, 132, 0.15)' };
    } else if (temperature < 35) {
      return { label: '温暖', color: '#FFB74D', bgColor: 'rgba(255, 183, 77, 0.15)' };
    } else {
      return { label: '炎热', color: '#E57373', bgColor: 'rgba(229, 115, 115, 0.15)' };
    }
  }

  public renderTrendChart(svgElement: SVGSVGElement, data: TrendDataPoint[], width: number, height: number): void {
    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();

    const margin = { top: 10, right: 20, bottom: 25, left: 30 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scalePoint()
      .domain(data.map(d => d.label))
      .range([0, innerWidth])
      .padding(0.5);

    const temps = data.map(d => d.temperature);
    const tempMin = Math.min(...temps) - 3;
    const tempMax = Math.max(...temps) + 3;

    const yScale = d3.scaleLinear()
      .domain([tempMin, tempMax])
      .range([innerHeight, 0]);

    const yAxis = d3.axisLeft(yScale)
      .ticks(3)
      .tickFormat(d => `${d}°`);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .attr('font-size', '10px');

    g.selectAll('.y-axis path, .y-axis line')
      .attr('stroke', 'rgba(255,255,255,0.2)');

    const xAxis = d3.axisBottom(xScale);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .attr('font-size', '11px');

    g.selectAll('.x-axis path, .x-axis line')
      .attr('stroke', 'rgba(255,255,255,0.2)');

    const line = d3.line<TrendDataPoint>()
      .x(d => xScale(d.label) || 0)
      .y(d => yScale(d.temperature))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const gradientId = 'line-gradient-' + Math.random().toString(36).substr(2, 9);
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

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', `url(#${gradientId})`)
      .attr('stroke-width', 2.5)
      .attr('d', line)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    const tooltip = g.append('g').style('display', 'none');

    tooltip.append('rect')
      .attr('class', 'tooltip-bg')
      .attr('fill', 'rgba(0,0,0,0.8)')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('width', 50)
      .attr('height', 22)
      .attr('x', -25)
      .attr('y', -35);

    tooltip.append('text')
      .attr('class', 'tooltip-text')
      .attr('fill', 'white')
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('y', -20);

    g.selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.label) || 0)
      .attr('cy', d => yScale(d.temperature))
      .attr('r', 0)
      .attr('fill', 'white')
      .attr('stroke', '#00d2ff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 6);

        tooltip.style('display', null);
        tooltip.attr('transform', `translate(${xScale(d.label)},${yScale(d.temperature)})`);
        tooltip.select('.tooltip-text').text(`${d.temperature.toFixed(1)}°C`);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', 4);

        tooltip.style('display', 'none');
      })
      .transition()
      .delay((_, i) => i * 100)
      .duration(400)
      .attr('r', 4);
  }

  public showTooltip(cell: GridCell, event: MouseEvent, tooltipElement: HTMLElement): void {
    const cellData = this.getCellData(cell.row, cell.col);
    if (!cellData) return;

    tooltipElement.textContent = `${cellData.regionId}: ${cellData.temperature.toFixed(1)}°C`;
    tooltipElement.classList.add('visible');

    const x = event.clientX + 15;
    const y = event.clientY + 15;
    tooltipElement.style.left = `${x}px`;
    tooltipElement.style.top = `${y}px`;
  }

  public hideTooltip(tooltipElement: HTMLElement): void {
    tooltipElement.classList.remove('visible');
  }
}
