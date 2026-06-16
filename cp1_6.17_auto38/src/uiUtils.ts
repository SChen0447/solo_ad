export interface TooltipData {
  x: number;
  y: number;
  fields: Array<{ key: string; value: string | number }>;
}

const TOOLTIP_ID = 'scatter-tooltip';

export function createTooltip(): HTMLDivElement {
  let el = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
  if (el) return el;

  el = document.createElement('div');
  el.id = TOOLTIP_ID;
  el.style.cssText = `
    position: fixed;
    z-index: 10000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    background: rgba(10, 10, 26, 0.92);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(100, 100, 200, 0.3);
    border-radius: 8px;
    padding: 10px 14px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    color: #cccccc;
    max-width: 280px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;
  document.body.appendChild(el);
  return el;
}

export function showTooltip(data: TooltipData): void {
  const el = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
  if (!el) return;

  let html = '';
  for (const field of data.fields) {
    html += `<div style="margin:2px 0;"><span style="color:#8888cc;">${field.key}:</span> ${field.value}</div>`;
  }
  el.innerHTML = html;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = data.x + 16;
  let top = data.y - 10;

  el.style.left = '0px';
  el.style.top = '0px';
  el.style.opacity = '1';

  requestAnimationFrame(() => {
    const rect = el.getBoundingClientRect();
    if (left + rect.width > vw - 10) left = data.x - rect.width - 16;
    if (top + rect.height > vh - 10) top = vh - rect.height - 10;
    if (top < 10) top = 10;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  });
}

export function hideTooltip(): void {
  const el = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
  if (el) {
    el.style.opacity = '0';
  }
}

export function removeTooltip(): void {
  const el = document.getElementById(TOOLTIP_ID);
  if (el) el.remove();
}
