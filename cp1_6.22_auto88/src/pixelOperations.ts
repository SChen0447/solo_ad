export interface Operation {
  id: string;
  type: 'draw';
  color: string;
  gridX: number;
  gridY: number;
  brushSize: 1 | 4;
  userId: string;
  timestamp: number;
}

export interface CanvasState {
  pixels: (string | null)[][];
  width: number;
  height: number;
}

export const CELL_SIZE = 8;
export const GRID_COLS = 80;
export const GRID_ROWS = 60;
export const BG_COLOR = '#2d3748';
export const GRID_COLOR = '#4a5568';

export const NEON_PALETTE: string[] = [
  '#ff007f', '#ff00aa', '#aa00ff', '#7f00ff',
  '#0000ff', '#0055ff', '#00aaff', '#00e5ff',
  '#00ffff', '#00ffaa', '#00ff88', '#00ff00',
  '#88ff00', '#ccff00', '#ffff00', '#ffcc00',
  '#ff8800', '#ff5500', '#ff0000', '#ff2244',
  '#ffffff', '#cccccc', '#888888', '#444444'
];

export function createEmptyCanvas(cols: number = GRID_COLS, rows: number = GRID_ROWS): CanvasState {
  const pixels: (string | null)[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < cols; x++) {
      row.push(null);
    }
    pixels.push(row);
  }
  return { pixels, width: cols, height: rows };
}

export interface AffectedCell {
  gridX: number;
  gridY: number;
  prevColor: string | null;
}

export function drawPixel(
  state: CanvasState,
  gridX: number,
  gridY: number,
  color: string,
  brushSize: 1 | 4 = 1
): { state: CanvasState; affected: AffectedCell[] } {
  const newPixels = state.pixels.map(row => [...row]);
  const affected: AffectedCell[] = [];
  const radius = Math.floor(brushSize / 2);

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = gridX + dx;
      const y = gridY + dy;
      if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
        const prev = newPixels[y][x];
        if (prev !== color) {
          newPixels[y][x] = color;
          affected.push({ gridX: x, gridY: y, prevColor: prev });
        }
      }
    }
  }

  return { state: { ...state, pixels: newPixels }, affected };
}

export function undoPixel(
  state: CanvasState,
  affected: AffectedCell[]
): { state: CanvasState; restored: AffectedCell[] } {
  const newPixels = state.pixels.map(row => [...row]);
  const restored: AffectedCell[] = [];

  for (const cell of affected) {
    if (cell.gridX >= 0 && cell.gridX < state.width && cell.gridY >= 0 && cell.gridY < state.height) {
      const current = newPixels[cell.gridY][cell.gridX];
      newPixels[cell.gridY][cell.gridX] = cell.prevColor;
      restored.push({ ...cell, prevColor: current });
    }
  }

  return { state: { ...state, pixels: newPixels }, restored };
}

export function applyReplayStep(
  state: CanvasState,
  operation: Operation
): { state: CanvasState; affected: AffectedCell[] } {
  return drawPixel(state, operation.gridX, operation.gridY, operation.color, operation.brushSize);
}

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  if (diff < 1000) return '刚刚';
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  return `${Math.floor(diff / 3600000)}小时前`;
}
