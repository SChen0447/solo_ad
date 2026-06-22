import * as d3 from 'd3';
import { AlignmentResult } from '@/types';

export interface ChartRendererOptions {
  barChartSelector: string;
  gaugeChartSelector: string;
  width?: number;
  height?: number;
  onBarClick?: (atomIndex: number) => void;
}

export class ChartRenderer {
  private barSvg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private gaugeSvg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width: number;
  private height: number;
  private onBarClick?: (atomIndex: number) => void;
  private currentRmsd: number = 0;
  private selectedBar: number | null = null;
  private readonly BAR_WIDTH = 16;
  private readonly BAR_GAP = 4;
  private readonly GAUGE_MIN = 0;
  private readonly GAUGE_MAX = 5;

  constructor(options: ChartRendererOptions) {
    this.width = options.width || 420;
    this.height = options.height || 320;
    this.onBarClick = options.onBarClick;

    this.barSvg = d3.select(options.barChartSelector)
      .attr('width', this.width)
      .attr('height', this.height);

    this.gaugeSvg = d3.select(options.gaugeChartSelector)
      .attr('width', this.width)
      .attr('height', this.height);
  }

  update(alignment: AlignmentResult | null): void {
    this.fadeInCharts();
    
    if (alignment) {
      this.renderBarChart(alignment);
      this.renderGauge(alignment.rmsd);
    } else {
      this.clearCharts();
    }
  }

  private fadeInCharts(): void {
    this.barSvg.style('opacity', 0)
      .transition()
      .duration(300)
      .ease(d3.easeCubicInOut)
      .style('opacity', 1);

    this.gaugeSvg.style('opacity', 0)
      .transition()
      .duration(300)
      .ease(d3.easeCubicInOut)
      .style('opacity', 1);
  }

  private renderBarChart(alignment: AlignmentResult): void {
    this.barSvg.selectAll('*').remove();
    this.selectedBar = null;

    const data = alignment.offsets;
    if (data.length === 0) return;

    const margin = { top: 30, right: 20, bottom: 50, left: 50 };
    const chartWidth = this.width - margin.left - margin.right;
    const chartHeight = this.height - margin.top - margin.bottom;

    const g = this.barSvg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .domain(data.map((_, i) => i.toString()))
      .range([0, chartWidth])
      .padding(this.BAR_GAP / (this.BAR_WIDTH + this.BAR_GAP));

    const maxOffset = Math.max(...data.map(d => d.offset), alignment.rmsd * 1.5, 0.5);
    const y = d3.scaleLinear()
      .domain([0, maxOffset])
      .range([chartHeight, 0])
      .nice();

    const colorScale = d3.scaleLinear<string>()
      .domain([0, maxOffset / 2, maxOffset])
      .range(['#22C55E', '#EAB308', '#EF4444']);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(x).tickValues(
        data.length > 10 
          ? data.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map((_, i) => 
              (i * Math.ceil(data.length / 10)).toString()
            )
          : data.map((_, i) => i.toString())
      ))
      .selectAll('text')
      .style('fill', '#94A3B8')
      .style('font-size', '10px');

    g.selectAll('.x-axis path, .x-axis line')
      .style('stroke', '#475569');

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y).ticks(5))
      .selectAll('text')
      .style('fill', '#94A3B8')
      .style('font-size', '10px');

    g.selectAll('.y-axis path, .y-axis line')
      .style('stroke', '#475569');

    g.append('text')
      .attr('x', -margin.left + 10)
      .attr('y', -10)
      .attr('text-anchor', 'start')
      .style('fill', '#94A3B8')
      .style('font-size', '11px')
      .text('距离 (Å)');

    g.append('text')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 40)
      .attr('text-anchor', 'middle')
      .style('fill', '#94A3B8')
      .style('font-size', '11px')
      .text('原子索引');

    const thresholdLine = g.append('line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', y(alignment.diffIndices.length > 0 ? Math.max(...data.filter(d => d.offset > 0.5).map(d => d.offset)) * 0.8 : 0.5))
      .attr('y2', y(alignment.diffIndices.length > 0 ? Math.max(...data.filter(d => d.offset > 0.5).map(d => d.offset)) * 0.8 : 0.5))
      .style('stroke', '#EF4444')
      .style('stroke-dasharray', '4,4')
      .style('stroke-width', 1)
      .style('opacity', 0.6);

    const bars = g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (_, i) => x(i.toString())!)
      .attr('y', chartHeight)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', d => colorScale(d.offset))
      .attr('rx', 2)
      .style('cursor', 'pointer');

    bars.transition()
      .duration(500)
      .delay((_, i) => i * 20)
      .ease(d3.easeCubicOut)
      .attr('y', d => y(d.offset))
      .attr('height', d => chartHeight - y(d.offset));

    bars.on('click', (event, d) => {
      event.stopPropagation();
      const atomIndex = d.index;
      
      g.selectAll('.bar').classed('selected', false);
      
      if (this.selectedBar === atomIndex) {
        this.selectedBar = null;
      } else {
        this.selectedBar = atomIndex;
        d3.select(event.currentTarget).classed('selected', true);
        
        if (this.onBarClick) {
          this.onBarClick(atomIndex);
        }
      }
    });

    bars.on('mouseenter', function(event, d) {
      const [xPos, yPos] = d3.pointer(event);
      const tooltip = g.append('g')
        .attr('class', 'tooltip')
        .attr('transform', `translate(${xPos + 10}, ${yPos - 10})`);

      tooltip.append('rect')
        .attr('width', 120)
        .attr('height', 50)
        .attr('rx', 6)
        .attr('fill', '#1E293B')
        .attr('stroke', '#60A5FA')
        .attr('stroke-width', 1);

      tooltip.append('text')
        .attr('x', 10)
        .attr('y', 20)
        .style('fill', '#E2E8F0')
        .style('font-size', '12px')
        .text(`原子 ${d.index}`);

      tooltip.append('text')
        .attr('x', 10)
        .attr('y', 38)
        .style('fill', d.offset > 0.5 ? '#EF4444' : '#22C55E')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(`偏移: ${d.offset.toFixed(3)} Å`);
    })
    .on('mouseleave', function() {
      g.selectAll('.tooltip').remove();
    });
  }

  private renderGauge(rmsd: number): void {
    this.gaugeSvg.selectAll('*').remove();
    this.currentRmsd = rmsd;

    const centerX = this.width / 2;
    const centerY = this.height * 0.6;
    const outerRadius = Math.min(this.width, this.height) * 0.35;
    const innerRadius = outerRadius * 0.6;

    const g = this.gaugeSvg.append('g')
      .attr('transform', `translate(${centerX},${centerY})`);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2);

    const defs = this.gaugeSvg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'gaugeGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#22C55E');

    gradient.append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#EAB308');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#EF4444');

    g.append('path')
      .attr('d', arc({ startAngle: -Math.PI / 2, endAngle: Math.PI / 2 } as any))
      .attr('fill', '#334155');

    const normalizedValue = Math.min(Math.max(rmsd, this.GAUGE_MIN), this.GAUGE_MAX) / this.GAUGE_MAX;
    const endAngle = -Math.PI / 2 + normalizedValue * Math.PI;

    const valueArc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .startAngle(-Math.PI / 2)
      .endAngle(endAngle);

    g.append('path')
      .attr('d', valueArc({ startAngle: -Math.PI / 2, endAngle } as any))
      .attr('fill', 'url(#gaugeGradient)')
      .attr('opacity', 0)
      .transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);

    const ticks = [0, 1, 2, 3, 4, 5];
    const tickArc = outerRadius + 15;

    ticks.forEach(tick => {
      const angle = -Math.PI / 2 + (tick / this.GAUGE_MAX) * Math.PI;
      const x1 = Math.cos(angle) * (outerRadius + 5);
      const y1 = Math.sin(angle) * (outerRadius + 5);
      const x2 = Math.cos(angle) * (outerRadius + 10);
      const y2 = Math.sin(angle) * (outerRadius + 10);
      const textX = Math.cos(angle) * tickArc;
      const textY = Math.sin(angle) * tickArc;

      g.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .style('stroke', '#64748B')
        .style('stroke-width', 2);

      g.append('text')
        .attr('x', textX)
        .attr('y', textY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('fill', '#94A3B8')
        .style('font-size', '11px')
        .text(tick.toString());
    });

    const pointerGroup = g.append('g')
      .attr('class', 'pointer')
      .attr('transform', 'rotate(-90)');

    pointerGroup.append('polygon')
      .attr('points', `0,-${outerRadius * 0.85} -6,10 6,10`)
      .attr('fill', '#60A5FA')
      .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');

    pointerGroup.append('circle')
      .attr('r', 8)
      .attr('fill', '#1E293B')
      .attr('stroke', '#60A5FA')
      .attr('stroke-width', 2);

    const targetRotation = -90 + normalizedValue * 180;
    pointerGroup.transition()
      .duration(800)
      .ease(d3.easeElasticOut.amplitude(1).period(0.5))
      .attr('transform', `rotate(${targetRotation})`);

    g.append('text')
      .attr('x', 0)
      .attr('y', -innerRadius * 0.3)
      .attr('text-anchor', 'middle')
      .style('fill', '#94A3B8')
      .style('font-size', '12px')
      .text('RMSD');

    const rmsdText = g.append('text')
      .attr('x', 0)
      .attr('y', innerRadius * 0.3)
      .attr('text-anchor', 'middle')
      .style('fill', '#F8FAFC')
      .style('font-size', '0px')
      .style('font-weight', 'bold')
      .text('');

    rmsdText.transition()
      .duration(800)
      .style('font-size', '24px')
      .tween('text', function() {
        const that = this;
        const interpolator = d3.interpolateNumber(0, rmsd);
        return function(t: number) {
          that.textContent = interpolator(t).toFixed(3) + ' Å';
        };
      });

    g.append('text')
      .attr('x', 0)
      .attr('y', innerRadius * 0.7)
      .attr('text-anchor', 'middle')
      .style('fill', '#64748B')
      .style('font-size', '10px')
      .text('Å');
  }

  highlightBar(atomIndex: number): void {
    this.barSvg.selectAll('.bar')
      .classed('selected', (_, i, nodes) => {
        const data = d3.select(nodes[i]).datum() as { index: number };
        return data.index === atomIndex;
      });

    setTimeout(() => {
      this.barSvg.selectAll('.bar').classed('selected', false);
    }, 2000);
  }

  clearCharts(): void {
    this.barSvg.selectAll('*').remove();
    this.gaugeSvg.selectAll('*').remove();
    
    this.barSvg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .attr('text-anchor', 'middle')
      .style('fill', '#64748B')
      .style('font-size', '13px')
      .text('请加载两个分子进行比对');

    this.gaugeSvg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .attr('text-anchor', 'middle')
      .style('fill', '#64748B')
      .style('font-size', '13px')
      .text('等待比对数据...');
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    this.barSvg.attr('width', width).attr('height', height);
    this.gaugeSvg.attr('width', width).attr('height', height);
  }

  dispose(): void {
    this.barSvg.selectAll('*').remove();
    this.gaugeSvg.selectAll('*').remove();
  }
}
