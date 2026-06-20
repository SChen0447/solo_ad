import type { HistoryEvent, YearData, EventType } from './dataGenerator';
import type { NodeDatum, RenderHandles, RenderOptions } from './ringRenderer';
import { highlightNode, highlightYear } from './ringRenderer';

export interface InteractionState {
  hoveredEventId: string | null;
  selectedYear: number | null;
  selectedEventId: string | null;
}

export interface InteractionBindings {
  readonly tooltipEl: HTMLElement;
  readonly panelEl: HTMLElement;
  readonly panelYearEl: HTMLElement;
  readonly panelCountEl: HTMLElement;
  readonly panelListEl: HTMLElement;
  readonly panelCloseEl: HTMLElement;
}

export const TYPE_LABELS: Record<EventType, string> = {
  culture: '文化',
  tech: '科技',
  politics: '政治'
};

function starsFor(n: number): string {
  const count = Math.max(1, Math.min(5, n));
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += i < count ? '★' : '☆';
  }
  return s;
}

function formatTooltipHTML(event: HistoryEvent): string {
  return `
    <div class="tooltip-title">
      <span>${event.title}</span>
    </div>
    <div class="tooltip-date">📅 ${event.date}</div>
    <span class="tooltip-type ${event.type}">${TYPE_LABELS[event.type]}</span>
    <div class="tooltip-desc">${event.description}</div>
    <div class="tooltip-stars">${starsFor(event.importance)}</div>
  `;
}

function renderPanelList(
  listEl: HTMLElement,
  year: number,
  events: readonly HistoryEvent[],
  activeId: string | null,
  onEventClick: (event: HistoryEvent) => void
): void {
  listEl.innerHTML = '';
  const frag = document.createDocumentFragment();

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;

    const item = document.createElement('div');
    item.className = `event-item${ev.id === activeId ? ' active' : ''}`;
    item.dataset['eventId'] = ev.id;

    item.innerHTML = `
      <div class="ei-top">
        <div class="ei-title">${ev.title}</div>
        <div class="ei-date">${ev.date}</div>
      </div>
      <div class="ei-desc">${ev.description}</div>
      <div class="ei-meta">
        <span class="ei-tag ${ev.type}">${TYPE_LABELS[ev.type]}</span>
        <span class="ei-stars">${starsFor(ev.importance)}</span>
      </div>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      onEventClick(ev);
    });

    frag.appendChild(item);
  }

  listEl.appendChild(frag);
  void year;
}

export function setupInteractions(
  handles: RenderHandles,
  bindings: InteractionBindings,
  opts: RenderOptions,
  allYears: readonly YearData[]
): InteractionState {
  const state: InteractionState = {
    hoveredEventId: null,
    selectedYear: null,
    selectedEventId: null
  };

  const { tooltipEl, panelEl, panelYearEl, panelCountEl, panelListEl, panelCloseEl } = bindings;

  let rafId: number | null = null;
  let pendingX = 0;
  let pendingY = 0;
  let tooltipVisible = false;

  function updateTooltipPos(): void {
    rafId = null;
    if (!tooltipVisible) return;
    tooltipEl.style.left = `${pendingX}px`;
    tooltipEl.style.top = `${pendingY}px`;
  }

  function scheduleTooltipPos(clientX: number, clientY: number): void {
    pendingX = clientX;
    pendingY = clientY;
    if (rafId === null) {
      rafId = requestAnimationFrame(updateTooltipPos);
    }
  }

  function showTooltip(ev: HistoryEvent, clientX: number, clientY: number): void {
    tooltipEl.innerHTML = formatTooltipHTML(ev);
    tooltipVisible = true;
    scheduleTooltipPos(clientX, clientY);
    requestAnimationFrame(() => {
      tooltipEl.classList.add('visible');
    });
  }

  function hideTooltip(): void {
    tooltipVisible = false;
    tooltipEl.classList.remove('visible');
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function findYearData(year: number): YearData | undefined {
    for (const y of allYears) {
      if (y.year === year) return y;
    }
    return undefined;
  }

  function openPanel(year: number, focusEventId: string | null = null): void {
    const yd = findYearData(year);
    if (!yd) return;

    state.selectedYear = year;
    state.selectedEventId = focusEventId;

    panelYearEl.textContent = String(year);
    panelCountEl.textContent = `共 ${yd.events.length} 个事件 · ${
      yd.events.filter(e => e.type === 'culture').length
    } 文化 · ${
      yd.events.filter(e => e.type === 'tech').length
    } 科技 · ${
      yd.events.filter(e => e.type === 'politics').length
    } 政治`;

    renderPanelList(panelListEl, year, yd.events, focusEventId, (clickedEv) => {
      state.selectedEventId = clickedEv.id;
      highlightNode(handles, clickedEv.id);
      const items = panelListEl.querySelectorAll<HTMLElement>('.event-item');
      items.forEach(it => {
        if (it.dataset['eventId'] === clickedEv.id) it.classList.add('active');
        else it.classList.remove('active');
      });
      const bbox = (handles.svg.node() as SVGSVGElement | null)?.getBoundingClientRect();
      if (bbox) {
        showTooltip(clickedEv, bbox.left + bbox.width / 2, bbox.top + bbox.height / 3);
      }
    });

    highlightYear(handles, year, opts, allYears);
    highlightNode(handles, focusEventId);
    panelEl.classList.add('open');
  }

  function closePanel(): void {
    state.selectedYear = null;
    state.selectedEventId = null;
    panelEl.classList.remove('open');
    highlightYear(handles, null, opts, allYears);
    highlightNode(handles, null);
    hideTooltip();
  }

  handles.nodeGroup.selectAll<SVGGElement, NodeDatum>('.node-item')
    .on('mouseenter', function (event, d) {
      state.hoveredEventId = d.event.id;
      const clientX = (event as MouseEvent).clientX;
      const clientY = (event as MouseEvent).clientY;
      showTooltip(d.event, clientX, clientY);
      if (state.selectedYear === null || state.selectedYear === d.event.year) {
        highlightNode(handles, d.event.id);
      }
    })
    .on('mousemove', function (event) {
      const clientX = (event as MouseEvent).clientX;
      const clientY = (event as MouseEvent).clientY;
      scheduleTooltipPos(clientX, clientY);
    })
    .on('mouseleave', function () {
      state.hoveredEventId = null;
      hideTooltip();
      if (state.selectedYear === null) {
        highlightNode(handles, null);
      } else {
        highlightNode(handles, state.selectedEventId);
      }
    })
    .on('click', function (event, d) {
      (event as MouseEvent).stopPropagation();
      if (state.selectedYear === d.event.year) {
        closePanel();
      } else {
        openPanel(d.event.year, d.event.id);
      }
    });

  handles.ringGroup.selectAll<SVGPathElement, { year: number; ringIndex: number }>('.ring-path')
    .on('mouseenter', function () {
      const yr = Number(this.getAttribute('data-year'));
      if (!Number.isNaN(yr) && state.selectedYear === null) {
        highlightYear(handles, yr, opts, allYears);
      }
    })
    .on('mouseleave', function () {
      if (state.selectedYear === null) {
        highlightYear(handles, null, opts, allYears);
      }
    })
    .on('click', function (event) {
      (event as MouseEvent).stopPropagation();
      const yr = Number(this.getAttribute('data-year'));
      if (!Number.isNaN(yr)) {
        if (state.selectedYear === yr) {
          closePanel();
        } else {
          openPanel(yr, null);
        }
      }
    });

  panelCloseEl.addEventListener('click', (e) => {
    e.stopPropagation();
    closePanel();
  });

  document.addEventListener('click', (e) => {
    if (state.selectedYear === null) return;
    const target = e.target as Node;
    if (panelEl.contains(target)) return;
    const svg = handles.svg.node();
    if (svg && svg.contains(target)) return;
    closePanel();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedYear !== null) {
      closePanel();
    }
  });

  return state;
}
