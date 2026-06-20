export interface GridConfig {
  columns: number;
  rows: number;
  rowHeight: number;
  columnGap: number;
  rowGap: number;
  cellColors: Record<string, string>;
}

export interface Template {
  id: string;
  name: string;
  config: GridConfig;
  thumbnail: string;
  createdAt: number;
}

export const DEFAULT_ROWS = 4;
export const MAX_TEMPLATES = 20;
export const MAX_COLOR_HISTORY = 10;

export function getDefaultGridConfig(): GridConfig {
  return {
    columns: 4,
    rows: DEFAULT_ROWS,
    rowHeight: 100,
    columnGap: 16,
    rowGap: 16,
    cellColors: {}
  };
}

export function generateCellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parseCellKey(key: string): { row: number; col: number } {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

export function serializeTemplate(
  config: GridConfig,
  name: string,
  thumbnail: string
): Template {
  return {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    config: JSON.parse(JSON.stringify(config)),
    thumbnail,
    createdAt: Date.now()
  };
}

export function deserializeTemplate(template: Template): GridConfig {
  return JSON.parse(JSON.stringify(template.config));
}

export async function captureThumbnail(
  element: HTMLElement,
  width = 200,
  height = 150
): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const rect = element.getBoundingClientRect();
  const scale = Math.min(width / rect.width, height / rect.height);

  canvas.width = width;
  canvas.height = height;

  const computedStyle = window.getComputedStyle(element);
  ctx.fillStyle = computedStyle.backgroundColor || '#282840';
  ctx.fillRect(0, 0, width, height);

  const config = extractGridConfigFromElement(element);
  if (config) {
    drawGridToCanvas(ctx, config, width, height, scale);
  }

  return canvas.toDataURL('image/png');
}

function extractGridConfigFromElement(element: HTMLElement): GridConfig | null {
  const style = window.getComputedStyle(element);
  const gridTemplateColumns = style.gridTemplateColumns;
  const gridTemplateRows = style.gridTemplateRows;
  const columnGap = parseInt(style.columnGap) || 0;
  const rowGap = parseInt(style.rowGap) || 0;

  if (!gridTemplateColumns || gridTemplateColumns === 'none') return null;

  const columns = gridTemplateColumns.split(' ').length;
  const rows = gridTemplateRows && gridTemplateRows !== 'none'
    ? gridTemplateRows.split(' ').length
    : 4;
  const rowHeight = parseInt(gridTemplateRows?.split(' ')[0]) || 100;

  const cellColors: Record<string, string> = {};
  const children = element.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    const key = child.dataset.cellKey;
    const bgColor = window.getComputedStyle(child).backgroundColor;
    if (key && bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      cellColors[key] = rgbToHex(bgColor);
    }
  }

  return { columns, rows, rowHeight, columnGap, rowGap, cellColors };
}

function drawGridToCanvas(
  ctx: CanvasRenderingContext2D,
  config: GridConfig,
  canvasWidth: number,
  canvasHeight: number,
  scale: number
) {
  const padding = 10;
  const drawWidth = canvasWidth - padding * 2;
  const drawHeight = canvasHeight - padding * 2;

  const gapX = config.columnGap * scale;
  const gapY = config.rowGap * scale;

  const cellWidth = (drawWidth - gapX * (config.columns - 1)) / config.columns;
  const cellHeight = (drawHeight - gapY * (config.rows - 1)) / config.rows;

  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.columns; c++) {
      const x = padding + c * (cellWidth + gapX);
      const y = padding + r * (cellHeight + gapY);
      const key = generateCellKey(r + 1, c + 1);

      ctx.fillStyle = config.cellColors[key] || '#282840';
      ctx.fillRect(x, y, cellWidth, cellHeight);

      ctx.strokeStyle = '#4a4a6a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellWidth, cellHeight);
    }
  }
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) {
    const rgbaMatch = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)$/);
    if (!rgbaMatch) return rgb;
    const [, r, g, b] = rgbaMatch;
    return '#' + [r, g, b].map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  const [, r, g, b] = match;
  return '#' + [r, g, b].map(x => {
    const hex = parseInt(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function hexToRgba(hex: string, alpha = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function hsvToHex(h: number, s: number, v: number): string {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, v: 0 };
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, v };
}
