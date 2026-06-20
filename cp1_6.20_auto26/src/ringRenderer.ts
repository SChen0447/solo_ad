import * as d3 from 'd3';
import type { HistoryEvent, YearData, EventType } from './dataGenerator';

export interface NodeDatum {
  event: HistoryEvent;
  year: number;
  ringIndex: number;
  radius: number;
  angle: number;
  x: number;
  y: number;
  shapeSize: number;
}

export interface RenderOptions {
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly ringGap: number;
  readonly typeColors: Record<EventType, string>;
  readonly ringColors: readonly string[];
}

export interface RenderHandles {
  readonly svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  readonly ringGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly labelGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  readonly glowFilter: d3.Selection<SVGFEGaussianBlurElement, unknown, null, undefined>;
  readonly rootG: d3.Selection<SVGGElement, unknown, null, undefined>;
}

export const TYPE_COLORS: Record<EventType, string> = {
  culture: '#00f0ff',
  tech: '#ffd93d',
  politics: '#ff6b6b'
};

export const RING_PALETTE: readonly string[] = [
  '#00f0ff', '#4ad0ff', '#78b5ff', '#9da7ff', '#bd98ff',
  '#d68fff', '#e588e6', '#f082cf', '#f77db8', '#fc7aa3',
  '#ff7b8e', '#ff7e78', '#ff856a', '#ff8e5f', '#ff9855',
  '#ffa54d', '#ffb247', '#ffc043', '#ffcd40', '#ffd93d'
];

export function buildRenderOptions(width: number, height: number): RenderOptions {
  const centerX = width / 2;
  const centerY = height / 2;
  const minDim = Math.min(width, height);
  const outerRadius = Math.floor(minDim * 0.42);
  const innerRadius = Math.floor(minDim * 0.12);
  const ringGap = (outerRadius - innerRadius) / 20;
  return {
    width,
    height,
    centerX,
    centerY,
    innerRadius,
    outerRadius,
    ringGap,
    typeColors: TYPE_COLORS,
    ringColors: RING_PALETTE
  };
}

export function computeNodePositions(
  years: readonly YearData[],
  opts: RenderOptions,
  indexFrom: 'inner' | 'outer' = 'inner'
): NodeDatum[] {
  const out: NodeDatum[] = [];
  const numYears = years.length;

  for (let yIdx = 0; yIdx < numYears; yIdx++) {
    const yearData = years[yIdx];
    if (!yearData) continue;

    const ringIndex = indexFrom === 'inner' ? yIdx : (numYears - 1 - yIdx);
    const radius = opts.innerRadius + opts.ringGap * (ringIndex + 0.5);

    const totalEvents = yearData.events.length;
    if (totalEvents === 0) continue;

    for (let i = 0; i < totalEvents; i++) {
      const event = yearData.events[i];
      if (!event) continue;

      const dayOfYear = (event.month - 1) * 30 + event.day;
      const baseAngle = (dayOfYear / 365) * Math.PI * 2 - Math.PI / 2;
      const jitter = ((i * 7 + event.importance * 3) % 11 - 5) * 0.004;
      const angle = baseAngle + jitter;
      const x = opts.centerX + Math.cos(angle) * radius;
      const y = opts.centerY + Math.sin(angle) * radius;

      const shapeSize = 4 + event.importance * 2.2;

      out.push({
        event,
        year: event.year,
        ringIndex,
        radius,
        angle,
        x,
        y,
        shapeSize
      });
    }
  }
  return out;
}

export function ensureDefs(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>): void {
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) {
    defs = svg.append('defs');
  }

  if (defs.select('#nodeGlow').empty()) {
    const glow = defs.append('filter').attr('id', 'nodeGlow').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  if (defs.select('#softGlow').empty()) {
    const soft = defs.append('filter').attr('id', 'softGlow').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%');
    soft.append('feGaussianBlur').attr('stdDeviation', '1.4');
  }

  if (defs.select('#ringGlow').empty()) {
    const ring = defs.append('filter').attr('id', 'ringGlow').attr('x', '-10%').attr('y', '-60%').attr('width', '120%').attr('height', '220%');
    ring.append('feGaussianBlur').attr('stdDeviation', '1.8');
  }

  if (defs.select('#radialGradientCenter').empty()) {
    const grad = defs.append('radialGradient').attr('id', 'radialGradientCenter').attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#00f0ff').attr('stop-opacity', 0.28);
    grad.append('stop').attr('offset', '60%').attr('stop-color', '#00f0ff').attr('stop-opacity', 0.06);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#00f0ff').attr('stop-opacity', 0);
  }
}

export function initRings(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  years: readonly YearData[],
  opts: RenderOptions
): RenderHandles {
  ensureDefs(svg);

  svg.selectAll('*').remove();
  svg.attr('viewBox', `0 0 ${opts.width} ${opts.height}`);

  svg.append('circle')
    .attr('cx', opts.centerX)
    .attr('cy', opts.centerY)
    .attr('r', opts.innerRadius * 0.98)
    .attr('fill', 'url(#radialGradientCenter)');

  svg.append('text')
    .attr('x', opts.centerX)
    .attr('y', opts.centerY - 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#ffffff')
    .attr('font-size', Math.floor(opts.innerRadius * 0.36))
    .attr('font-weight', 700)
    .attr('letter-spacing', 2)
    .attr('opacity', 0.85)
    .text(years.length > 0 ? String(years[years.length - 1]?.year ?? '') : '');

  svg.append('text')
    .attr('x', opts.centerX)
    .attr('y', opts.centerY + Math.floor(opts.innerRadius * 0.28))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#00f0ff')
    .attr('font-size', Math.floor(opts.innerRadius * 0.16))
    .attr('letter-spacing', 3)
    .attr('opacity', 0.7)
    .text('NOW');

  const rootG = svg.append('g').attr('class', 'root-transform');

  const ringGroup = rootG.append('g').attr('class', 'rings');
  const nodeGroup = rootG.append('g').attr('class', 'nodes');
  const labelGroup = rootG.append('g').attr('class', 'labels');

  const numYears = years.length;
  for (let yIdx = 0; yIdx < numYears; yIdx++) {
    const yearData = years[yIdx];
    if (!yearData) continue;

    const ringIndex = yIdx;
    const innerR = opts.innerRadius + opts.ringGap * ringIndex + 0.8;
    const outerR = opts.innerRadius + opts.ringGap * (ringIndex + 1) - 0.8;
    const colorIdx = (numYears - 1 - ringIndex + opts.ringColors.length) % opts.ringColors.length;
    const ringColor = opts.ringColors[colorIdx] ?? '#ffffff';

    const ringPath = d3.arc()({
      innerRadius: innerR,
      outerRadius: outerR,
      startAngle: 0,
      endAngle: Math.PI * 2
    });

    if (ringPath) {
      ringGroup.append('path')
        .datum({ year: yearData.year, ringIndex })
        .attr('class', `ring-path ring-year-${yearData.year}`)
        .attr('data-year', String(yearData.year))
        .attr('d', ringPath)
        .attr('fill', ringColor)
        .attr('fill-opacity', 0.05 + (ringIndex / numYears) * 0.05)
        .attr('stroke', ringColor)
        .attr('stroke-opacity', 0.22)
        .attr('stroke-width', 0.8)
        .attr('filter', 'url(#ringGlow)')
        .style('transform-origin', `${opts.centerX}px ${opts.centerY}px`)
        .attr('cursor', 'pointer');
    }

    const labelR = opts.innerRadius + opts.ringGap * (ringIndex + 0.5);
    labelGroup.append('text')
      .attr('class', `year-label label-year-${yearData.year}`)
      .attr('data-year', String(yearData.year))
      .attr('x', opts.centerX)
      .attr('y', opts.centerY - labelR)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', ringColor)
      .attr('fill-opacity', 0.55)
      .attr('font-size', Math.max(9, Math.floor(opts.ringGap * 0.38)))
      .attr('font-weight', 500)
      .attr('letter-spacing', 1)
      .attr('pointer-events', 'none')
      .text(String(yearData.year));

    const tickCount = 12;
    for (let t = 0; t < tickCount; t++) {
      const angle = (t / tickCount) * Math.PI * 2 - Math.PI / 2;
      const r1 = innerR + (outerR - innerR) * 0.2;
      const r2 = innerR + (outerR - innerR) * 0.8;
      ringGroup.append('line')
        .attr('class', `ring-tick tick-year-${yearData.year}`)
        .attr('data-year', String(yearData.year))
        .attr('x1', opts.centerX + Math.cos(angle) * r1)
        .attr('y1', opts.centerY + Math.sin(angle) * r1)
        .attr('x2', opts.centerX + Math.cos(angle) * r2)
        .attr('y2', opts.centerY + Math.sin(angle) * r2)
        .attr('stroke', ringColor)
        .attr('stroke-opacity', 0.08)
        .attr('stroke-width', 0.6);
    }
  }

  const glowFilter = svg.select<SVGFEGaussianBlurElement>('#nodeGlow feGaussianBlur');

  return {
    svg,
    ringGroup,
    nodeGroup,
    labelGroup,
    glowFilter,
    rootG
  };
}

function shapePathFor(node: NodeDatum, type: EventType, size: number): string {
  if (type === 'culture') {
    return `M ${node.x} ${node.y} m -${size} 0 a ${size} ${size} 0 1 0 ${size * 2} 0 a ${size} ${size} 0 1 0 -${size * 2} 0`;
  }
  if (type === 'tech') {
    const h = size * 1.2;
    const p1 = `${node.x},${node.y - h}`;
    const p2 = `${node.x - size},${node.y + size * 0.8}`;
    const p3 = `${node.x + size},${node.y + size * 0.8}`;
    return `M ${p1} L ${p2} L ${p3} Z`;
  }
  const s = size;
  const p1 = `${node.x},${node.y - s}`;
  const p2 = `${node.x + s},${node.y}`;
  const p3 = `${node.x},${node.y + s}`;
  const p4 = `${node.x - s},${node.y}`;
  return `M ${p1} L ${p2} L ${p3} L ${p4} Z`;
}

export function renderNodes(
  handles: RenderHandles,
  nodes: readonly NodeDatum[],
  opts: RenderOptions
): d3.Selection<SVGGElement, NodeDatum, SVGGElement, unknown> {
  const { nodeGroup } = handles;

  const mutableNodes = nodes as NodeDatum[];

  const keyFn: d3.ValueFn<SVGGElement | null, NodeDatum, string> = function (
    this: SVGGElement | null,
    d: NodeDatum
  ): string {
    return d.event.id;
  };

  const nodeSelection = nodeGroup
    .selectAll<SVGGElement, NodeDatum>('g.node-item')
    .data<NodeDatum>(mutableNodes, keyFn);

  nodeSelection.exit().remove();

  const entering = nodeSelection.enter()
    .append('g')
    .attr('class', 'node-item')
    .attr('data-year', (d: NodeDatum) => String(d.year))
    .attr('data-type', (d: NodeDatum) => d.event.type)
    .attr('data-id', (d: NodeDatum) => d.event.id);

  entering.append('path')
    .attr('class', 'node-halo')
    .attr('d', (d: NodeDatum) => shapePathFor(d, d.event.type, d.shapeSize + 3))
    .attr('fill', (d: NodeDatum) => opts.typeColors[d.event.type])
    .attr('fill-opacity', 0.0)
    .style('transition', 'fill-opacity 0.3s ease');

  entering.append('path')
    .attr('class', 'node-shape')
    .attr('d', (d: NodeDatum) => shapePathFor(d, d.event.type, d.shapeSize))
    .attr('fill', (d: NodeDatum) => opts.typeColors[d.event.type])
    .attr('fill-opacity', 0.92)
    .attr('stroke', (d: NodeDatum) => opts.typeColors[d.event.type])
    .attr('stroke-opacity', 0.5)
    .attr('stroke-width', 0.8)
    .attr('filter', 'url(#nodeGlow)')
    .style('cursor', 'pointer');

  entering.append('path')
    .attr('class', 'node-hitarea')
    .attr('d', (d: NodeDatum) => {
      const cx = d.x;
      const cy = d.y;
      const r = d.shapeSize + 9;
      return `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 -${r * 2} 0`;
    })
    .attr('fill', 'transparent')
    .style('cursor', 'pointer');

  return entering.merge(nodeSelection);
}

export function applyYearFilter(
  handles: RenderHandles,
  allYears: readonly YearData[],
  filteredYears: readonly number[],
  durationMs: number = 520
): void {
  const { ringGroup, nodeGroup, labelGroup } = handles;
  const filteredSet = new Set(filteredYears);

  ringGroup.selectAll<SVGPathElement, { year: number; ringIndex: number }>('.ring-path')
    .transition().duration(durationMs).ease(d3.easeCubicOut)
    .attr('fill-opacity', (d) => filteredSet.has(d.year) ? 0.05 + (d.ringIndex / allYears.length) * 0.06 : 0.008)
    .attr('stroke-opacity', (d) => filteredSet.has(d.year) ? 0.25 : 0.04);

  ringGroup.selectAll<SVGLineElement, unknown>('.ring-tick')
    .transition().duration(durationMs).ease(d3.easeCubicOut)
    .attr('stroke-opacity', function () {
      const y = this.getAttribute('data-year');
      if (!y) return 0.04;
      return filteredSet.has(Number(y)) ? 0.09 : 0.015;
    });

  labelGroup.selectAll<SVGTextElement, unknown>('.year-label')
    .transition().duration(durationMs).ease(d3.easeCubicOut)
    .attr('fill-opacity', function () {
      const y = this.getAttribute('data-year');
      if (!y) return 0.0;
      return filteredSet.has(Number(y)) ? 0.6 : 0.08;
    });

  nodeGroup.selectAll<SVGGElement, NodeDatum>('.node-item')
    .transition().duration(durationMs).ease(d3.easeCubicOut)
    .attr('opacity', (d) => filteredSet.has(d.event.year) ? 1 : 0.03);
}

export function highlightYear(
  handles: RenderHandles,
  year: number | null,
  opts: RenderOptions,
  allYears: readonly YearData[]
): void {
  const { ringGroup } = handles;
  const numYears = allYears.length;

  ringGroup.selectAll<SVGPathElement, { year: number; ringIndex: number }>('.ring-path')
    .style('transition', 'all 0.28s cubic-bezier(0.4,0,0.2,1)')
    .each(function (d) {
      const el = this;
      const matches = d.year === year;
      const colorIdx = (numYears - 1 - d.ringIndex + opts.ringColors.length) % opts.ringColors.length;
      const ringColor = opts.ringColors[colorIdx] ?? '#ffffff';

      if (matches) {
        el.setAttribute('stroke', ringColor);
        el.setAttribute('stroke-width', '2.6');
        el.setAttribute('stroke-opacity', '0.85');
        el.setAttribute('fill-opacity', String(0.13 + (d.ringIndex / numYears) * 0.08));
        el.style.transform = 'scale(1.025)';
        el.style.filter = 'url(#nodeGlow)';
      } else if (year !== null) {
        el.setAttribute('stroke-width', '0.6');
        el.setAttribute('stroke-opacity', '0.12');
        el.setAttribute('fill-opacity', String(0.03 + (d.ringIndex / numYears) * 0.04));
        el.style.transform = 'scale(1)';
        el.style.filter = '';
      } else {
        el.setAttribute('stroke', ringColor);
        el.setAttribute('stroke-width', '0.8');
        el.setAttribute('stroke-opacity', '0.22');
        el.setAttribute('fill-opacity', String(0.05 + (d.ringIndex / numYears) * 0.05));
        el.style.transform = 'scale(1)';
        el.style.filter = 'url(#ringGlow)';
      }
    });
}

export function highlightNode(
  handles: RenderHandles,
  eventId: string | null
): void {
  handles.nodeGroup.selectAll<SVGGElement, NodeDatum>('.node-item')
    .style('transition', 'transform 0.2s ease, opacity 0.2s ease')
    .each(function (d) {
      const g = this;
      const halo = g.querySelector<SVGPathElement>('.node-halo');
      const shape = g.querySelector<SVGPathElement>('.node-shape');

      if (d.event.id === eventId) {
        g.style.transform = 'translateZ(0) scale(1.35)';
        g.style.zIndex = '10';
        if (halo) halo.setAttribute('fill-opacity', '0.35');
        if (shape) {
          shape.setAttribute('stroke-width', '1.6');
          shape.setAttribute('stroke-opacity', '1');
        }
      } else if (eventId !== null) {
        g.style.transform = 'translateZ(0) scale(0.92)';
        g.style.opacity = '0.45';
        if (halo) halo.setAttribute('fill-opacity', '0');
        if (shape) {
          shape.setAttribute('stroke-width', '0.8');
          shape.setAttribute('stroke-opacity', '0.5');
        }
      } else {
        g.style.transform = 'translateZ(0) scale(1)';
        g.style.opacity = '1';
        if (halo) halo.setAttribute('fill-opacity', '0');
        if (shape) {
          shape.setAttribute('stroke-width', '0.8');
          shape.setAttribute('stroke-opacity', '0.5');
        }
      }
    });
}
