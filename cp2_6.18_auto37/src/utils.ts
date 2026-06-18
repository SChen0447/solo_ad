export enum CellType {
  Empty = 0,
  Ground = 1,
  Spike = 2,
  Finish = 3,
  Player = 4,
}

export interface GridData {
  cols: number;
  rows: number;
  cells: CellType[];
}

export const CELL_SIZE = 30;

export function createEmptyGrid(cols: number, rows: number): GridData {
  return {
    cols,
    rows,
    cells: new Array(cols * rows).fill(CellType.Empty),
  };
}

export function getCell(grid: GridData, col: number, row: number): CellType {
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) {
    return CellType.Ground;
  }
  return grid.cells[row * grid.cols + col];
}

export function setCell(grid: GridData, col: number, row: number, value: CellType): GridData {
  const newCells = [...grid.cells];
  newCells[row * grid.cols + col] = value;
  return { ...grid, cells: newCells };
}

export function gridToPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  };
}

export function pixelToGrid(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.floor(x / CELL_SIZE),
    row: Math.floor(y / CELL_SIZE),
  };
}

export function findPlayerPosition(grid: GridData): { col: number; row: number } | null {
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (grid.cells[row * grid.cols + col] === CellType.Player) {
        return { col, row };
      }
    }
  }
  return null;
}

export function generatePresetLevel(): GridData {
  const cols = 24;
  const rows = 16;
  const grid = createEmptyGrid(cols, rows);

  let cells = grid.cells;

  for (let c = 0; c < cols; c++) {
    cells[15 * cols + c] = CellType.Ground;
  }

  for (let c = 0; c < 6; c++) {
    cells[11 * cols + c] = CellType.Ground;
  }

  for (let c = 8; c < 14; c++) {
    cells[9 * cols + c] = CellType.Ground;
  }

  for (let c = 16; c < 22; c++) {
    cells[7 * cols + c] = CellType.Ground;
  }

  cells[10 * cols + 9] = CellType.Spike;

  cells[6 * cols + 21] = CellType.Finish;

  cells[10 * cols + 1] = CellType.Player;

  return { cols, rows, cells };
}

export const CELL_COLORS: Record<CellType, string> = {
  [CellType.Empty]: 'transparent',
  [CellType.Ground]: '#8B4513',
  [CellType.Spike]: '#DC2626',
  [CellType.Finish]: '#F59E0B',
  [CellType.Player]: '#22C55E',
};

export const CELL_LABELS: Record<CellType, string> = {
  [CellType.Empty]: '',
  [CellType.Ground]: '地面',
  [CellType.Spike]: '尖刺',
  [CellType.Finish]: '终点',
  [CellType.Player]: '起点',
};
