import * as d3 from 'd3';
import { generateHistoryData, flattenEvents } from './dataGenerator';
import type { YearData } from './dataGenerator';
import {
  buildRenderOptions,
  computeNodePositions,
  initRings,
  renderNodes,
  applyYearFilter,
  highlightYear,
  highlightNode,
  TYPE_COLORS
} from './ringRenderer';
import type { RenderHandles, RenderOptions, NodeDatum } from './ringRenderer';
import { setupInteractions } from './interactionHandler';
import type { InteractionState } from './interactionHandler';

const NUM_YEARS = 20;

interface AppState {
  years: YearData[];
  nodes: NodeDatum[];
  opts: RenderOptions;
  handles: RenderHandles | null;
  interactionState: InteractionState | null;
  filterStartIdx: number;
  filterEndIdx: number;
  animating: boolean;
}

const state: AppState = {
  years: [],
  nodes: [],
  opts: buildRenderOptions(1, 1),
  handles: null,
  interactionState: null,
  filterStartIdx: 0,
  filterEndIdx: NUM_YEARS - 1,
  animating: false
};

function getContainerSize(): { width: number; height: number } {
  const container = document.getElementById('svgContainer');
  if (!container) {
    return { width: window.innerWidth, height: window.innerHeight - 180 };
  }
  const rect = container.getBoundingClientRect();
  const width = Math.max(400, Math.floor(rect.width));
  const height = Math.max(400, Math.floor(rect.height));
  return { width, height };
}

function buildRangeLabels(years: readonly YearData[]): void {
  const el = document.getElementById('rangeLabels');
  if (!el) return;
  const step = Math.max(1, Math.floor(years.length / 5));
  let html = '';
  for (let i = 0; i < years.length; i += step) {
    const y = years[i];
    if (!y) continue;
    const leftPct = (i / Math.max(1, years.length - 1)) * 100;
    html += `<span style="position:absolute;left:${leftPct}%;transform:translateX(-50%);">${y.year}</span>`;
  }
  el.style.position = 'relative';
  el.style.height = '14px';
  el.innerHTML = html;
}

function updateSliderUI(years: readonly YearData[], startIdx: number, endIdx: number): void {
  const startEl = document.getElementById('rangeStart') as HTMLInputElement | null;
  const endEl = document.getElementById('rangeEnd') as HTMLInputElement | null;
  const fillEl = document.getElementById('sliderFill');
  const labelEl = document.getElementById('sliderRangeLabel');

  if (!startEl || !endEl || !fillEl || !labelEl) return;

  const totalSteps = years.length - 1;
  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);

  const leftPct = (lo / totalSteps) * 100;
  const rightPct = (hi / totalSteps) * 100;
  fillEl.style.left = `${leftPct}%`;
  fillEl.style.right = `${100 - rightPct}%`;

  const loYear = years[lo]?.year ?? '—';
  const hiYear = years[hi]?.year ?? '—';
  labelEl.textContent = `${loYear}  —  ${hiYear}`;

  startEl.style.zIndex = lo < hi ? '6' : '7';
  endEl.style.zIndex = hi > lo ? '6' : '7';
}

function getFilteredYears(): number[] {
  const lo = Math.min(state.filterStartIdx, state.filterEndIdx);
  const hi = Math.max(state.filterStartIdx, state.filterEndIdx);
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) {
    const y = state.years[i];
    if (y) out.push(y.year);
  }
  return out;
}

function renderInitial(): void {
  const svgEl = document.getElementById('ringViz') as SVGSVGElement | null;
  const tooltipEl = document.getElementById('tooltip') as HTMLElement | null;
  const panelEl = document.getElementById('eventPanel') as HTMLElement | null;
  const panelYearEl = document.getElementById('panelYear') as HTMLElement | null;
  const panelCountEl = document.getElementById('panelCount') as HTMLElement | null;
  const panelListEl = document.getElementById('panelList') as HTMLElement | null;
  const panelCloseEl = document.getElementById('panelClose') as HTMLElement | null;

  if (!svgEl || !tooltipEl || !panelEl || !panelYearEl || !panelCountEl || !panelListEl || !panelCloseEl) {
    throw new Error('Critical DOM elements missing');
  }

  const { width, height } = getContainerSize();
  state.opts = buildRenderOptions(width, height);

  const svg = d3.select<SVGSVGElement, unknown>(svgEl);
  state.handles = initRings(svg, state.years, state.opts);
  state.nodes = computeNodePositions(state.years, state.opts, 'inner');
  renderNodes(state.handles, state.nodes, state.opts);

  state.interactionState = setupInteractions(state.handles, {
    tooltipEl,
    panelEl,
    panelYearEl,
    panelCountEl,
    panelListEl,
    panelCloseEl
  }, state.opts, state.years);

  buildRangeLabels(state.years);
  updateSliderUI(state.years, state.filterStartIdx, state.filterEndIdx);
  void flattenEvents;
  void TYPE_COLORS;
}

let resizeRafId: number | null = null;
function scheduleResize(): void {
  if (resizeRafId !== null) return;
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null;
    performResize();
  });
}

function performResize(): void {
  const svgEl = document.getElementById('ringViz') as SVGSVGElement | null;
  if (!svgEl) return;
  const svg = d3.select<SVGSVGElement, unknown>(svgEl);

  const prevYear = state.interactionState?.selectedYear ?? null;
  const prevEvt = state.interactionState?.selectedEventId ?? null;

  const { width, height } = getContainerSize();
  state.opts = buildRenderOptions(width, height);

  state.handles = initRings(svg, state.years, state.opts);
  state.nodes = computeNodePositions(state.years, state.opts, 'inner');
  renderNodes(state.handles, state.nodes, state.opts);

  const tooltipEl = document.getElementById('tooltip') as HTMLElement | null;
  const panelEl = document.getElementById('eventPanel') as HTMLElement | null;
  const panelYearEl = document.getElementById('panelYear') as HTMLElement | null;
  const panelCountEl = document.getElementById('panelCount') as HTMLElement | null;
  const panelListEl = document.getElementById('panelList') as HTMLElement | null;
  const panelCloseEl = document.getElementById('panelClose') as HTMLElement | null;

  if (!tooltipEl || !panelEl || !panelYearEl || !panelCountEl || !panelListEl || !panelCloseEl) return;

  state.interactionState = setupInteractions(state.handles, {
    tooltipEl,
    panelEl,
    panelYearEl,
    panelCountEl,
    panelListEl,
    panelCloseEl
  }, state.opts, state.years);

  applyYearFilter(state.handles, state.years, getFilteredYears(), 0);

  if (prevYear !== null && state.handles) {
    highlightYear(state.handles, prevYear, state.opts, state.years);
    if (prevEvt !== null) highlightNode(state.handles, prevEvt);
    state.interactionState.selectedYear = prevYear;
    state.interactionState.selectedEventId = prevEvt;
  }
}

function applyFilterWithAnim(): void {
  if (!state.handles) return;
  const filteredYears = getFilteredYears();
  applyYearFilter(state.handles, state.years, filteredYears, 520);
}

function bindSlider(): void {
  const startEl = document.getElementById('rangeStart') as HTMLInputElement | null;
  const endEl = document.getElementById('rangeEnd') as HTMLInputElement | null;
  if (!startEl || !endEl) return;

  startEl.min = '0';
  startEl.max = String(NUM_YEARS - 1);
  startEl.value = String(state.filterStartIdx);
  endEl.min = '0';
  endEl.max = String(NUM_YEARS - 1);
  endEl.value = String(state.filterEndIdx);

  let sliderRafId: number | null = null;
  const enqueue = (): void => {
    if (sliderRafId !== null) return;
    sliderRafId = requestAnimationFrame(() => {
      sliderRafId = null;
      updateSliderUI(state.years, state.filterStartIdx, state.filterEndIdx);
      applyFilterWithAnim();
    });
  };

  startEl.addEventListener('input', () => {
    const v = parseInt(startEl.value, 10);
    if (Number.isNaN(v)) return;
    state.filterStartIdx = v;
    if (state.filterStartIdx > state.filterEndIdx) {
      state.filterEndIdx = state.filterStartIdx;
      endEl.value = String(state.filterEndIdx);
    }
    enqueue();
  });

  endEl.addEventListener('input', () => {
    const v = parseInt(endEl.value, 10);
    if (Number.isNaN(v)) return;
    state.filterEndIdx = v;
    if (state.filterEndIdx < state.filterStartIdx) {
      state.filterStartIdx = state.filterEndIdx;
      startEl.value = String(state.filterStartIdx);
    }
    enqueue();
  });
}

function introAnimation(): void {
  if (!state.handles) return;
  state.animating = true;

  state.handles.svg.style('opacity', '0');
  state.handles.svg.transition()
    .duration(300)
    .ease(d3.easeLinear)
    .style('opacity', '1');

  state.handles.ringGroup.selectAll<SVGPathElement, { year: number; ringIndex: number }>('.ring-path')
    .attr('stroke-opacity', 0)
    .attr('fill-opacity', 0)
    .transition()
    .delay((_d, i) => i * 45)
    .duration(520)
    .ease(d3.easeCubicOut)
    .attr('stroke-opacity', 0.22)
    .attr('fill-opacity', function (_d, i) {
      const base = 0.05 + (i / Math.max(1, state.years.length)) * 0.05;
      return String(base);
    });

  state.handles.labelGroup.selectAll<SVGTextElement, unknown>('.year-label')
    .attr('opacity', 0)
    .transition()
    .delay((_d, i) => 300 + i * 45)
    .duration(420)
    .ease(d3.easeCubicOut)
    .attr('opacity', 1);

  state.handles.nodeGroup.selectAll<SVGGElement, NodeDatum>('.node-item')
    .attr('opacity', 0)
    .attr('transform', (d: NodeDatum) => {
      const dx = (d.x - state.opts.centerX) * 0.25;
      const dy = (d.y - state.opts.centerY) * 0.25;
      return `translate(${-dx},${-dy}) scale(0.6)`;
    })
    .transition()
    .delay((_d, i) => 500 + (i % 40) * 14)
    .duration(620)
    .ease(d3.easeCubicOut)
    .attr('opacity', 1)
    .attr('transform', 'translate(0,0) scale(1)')
    .on('end', () => {
      state.animating = false;
    });
}

function ensureCurrentYearSync(): void {
  const currentYear = new Date().getFullYear();
  state.years = generateHistoryData(NUM_YEARS, currentYear);
}

function boot(): void {
  try {
    ensureCurrentYearSync();
    bindSlider();
    renderInitial();
    introAnimation();
    window.addEventListener('resize', scheduleResize, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && resizeRafId === null) {
        scheduleResize();
      }
    });
  } catch (err) {
    console.error('[YearRing] 初始化失败:', err);
    const app = document.querySelector('.app');
    if (app) {
      const msg = document.createElement('div');
      msg.style.cssText = `
        position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
        color:#ff6b6b;font-family:system-ui;background:#0b0e14;z-index:9999;padding:32px;text-align:center;
      `;
      msg.textContent = `初始化失败: ${err instanceof Error ? err.message : String(err)}`;
      app.appendChild(msg);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
