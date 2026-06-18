import { ALL_COLORS, ColorName } from '../data/colorEmotionMap';
import { v4 as uuidv4 } from 'uuid';

export interface CellWalls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface MechanismRequirement {
  colors: ColorName[];
}

export interface Mechanism {
  id: string;
  row: number;
  col: number;
  requirement: MechanismRequirement;
  unlocked: boolean;
  wallToRemove: {
    row: number;
    col: number;
    side: 'top' | 'right' | 'bottom' | 'left';
  };
}

export interface LabyrinthCell {
  row: number;
  col: number;
  color: ColorName;
  walls: CellWalls;
  isMechanism: boolean;
  mechanismId: string | null;
}

export interface LabyrinthData {
  cells: LabyrinthCell[][];
  entrance: { row: number; col: number };
  exit: { row: number; col: number };
  mechanisms: Mechanism[];
  size: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomColor(): ColorName {
  return ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
}

function createWalls(): CellWalls {
  return { top: true, right: true, bottom: true, left: true };
}

function removeWallBetween(
  cells: LabyrinthCell[][],
  r1: number,
  c1: number,
  r2: number,
  c2: number
): void {
  if (r2 === r1 - 1) {
    cells[r1][c1].walls.top = false;
    cells[r2][c2].walls.bottom = false;
  } else if (r2 === r1 + 1) {
    cells[r1][c1].walls.bottom = false;
    cells[r2][c2].walls.top = false;
  } else if (c2 === c1 - 1) {
    cells[r1][c1].walls.left = false;
    cells[r2][c2].walls.right = false;
  } else if (c2 === c1 + 1) {
    cells[r1][c1].walls.right = false;
    cells[r2][c2].walls.left = false;
  }
}

function generateMazePaths(cells: LabyrinthCell[][], size: number): void {
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  const stack: { row: number; col: number }[] = [];
  const startRow = 0;
  const startCol = 0;
  visited[startRow][startCol] = true;
  stack.push({ row: startRow, col: startCol });

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const { row, col } = current;

    const neighbors = shuffleArray(directions)
      .map(({ dr, dc }) => ({ row: row + dr, col: col + dc }))
      .filter(
        (n) =>
          n.row >= 0 &&
          n.row < size &&
          n.col >= 0 &&
          n.col < size &&
          !visited[n.row][n.col]
      );

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[0];
      removeWallBetween(cells, row, col, next.row, next.col);
      visited[next.row][next.col] = true;
      stack.push(next);
    }
  }
}

function findRemovableWalls(cells: LabyrinthCell[][], size: number) {
  const removable: { row: number; col: number; side: 'top' | 'right' | 'bottom' | 'left'; nr: number; nc: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r > 0 && cells[r][c].walls.top) {
        removable.push({ row: r, col: c, side: 'top', nr: r - 1, nc: c });
      }
      if (c < size - 1 && cells[r][c].walls.right) {
        removable.push({ row: r, col: c, side: 'right', nr: r, nc: c + 1 });
      }
      if (r < size - 1 && cells[r][c].walls.bottom) {
        removable.push({ row: r, col: c, side: 'bottom', nr: r + 1, nc: c });
      }
      if (c > 0 && cells[r][c].walls.left) {
        removable.push({ row: r, col: c, side: 'left', nr: r, nc: c - 1 });
      }
    }
  }

  return removable;
}

function addMechanismWalls(cells: LabyrinthCell[][], mechanisms: Mechanism[]): void {
  for (const mech of mechanisms) {
    const { row, col, side } = mech.wallToRemove;
    cells[row][col].walls[side] = true;
    const opposite: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };
    const nr = side === 'top' ? row - 1 : side === 'bottom' ? row + 1 : row;
    const nc = side === 'left' ? col - 1 : side === 'right' ? col + 1 : col;
    if (nr >= 0 && nr < cells.length && nc >= 0 && nc < cells[0].length) {
      cells[nr][nc].walls[opposite[side]] = true;
    }
  }
}

function createMechanisms(cells: LabyrinthCell[][], size: number): Mechanism[] {
  const removableWalls = shuffleArray(findRemovableWalls(cells, size));
  const mechanismCells = shuffleArray(
    cells.flat().filter((c) => !(c.row === 0 && c.col === 0) && !(c.row === size - 1 && c.col === size - 1))
  );

  const mechanisms: Mechanism[] = [];
  const usedCells = new Set<string>();
  const count = Math.min(3, removableWalls.length, mechanismCells.length);

  for (let i = 0; i < count; i++) {
    const cell = mechanismCells[i];
    const key = `${cell.row},${cell.col}`;
    if (usedCells.has(key)) continue;
    usedCells.add(key);

    const wall = removableWalls[i];
    const seqLen = Math.random() > 0.5 ? 3 : 2;
    const requiredColors: ColorName[] = [];
    const availableColors = [...ALL_COLORS];
    for (let j = 0; j < seqLen; j++) {
      const idx = Math.floor(Math.random() * availableColors.length);
      requiredColors.push(availableColors[idx]);
    }

    const mechanism: Mechanism = {
      id: uuidv4(),
      row: cell.row,
      col: cell.col,
      requirement: { colors: requiredColors },
      unlocked: false,
      wallToRemove: { row: wall.row, col: wall.col, side: wall.side },
    };

    mechanisms.push(mechanism);
    cells[cell.row][cell.col].isMechanism = true;
    cells[cell.row][cell.col].mechanismId = mechanism.id;
  }

  return mechanisms;
}

export function generateLabyrinth(size: number = 5): LabyrinthData {
  const cells: LabyrinthCell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      row: r,
      col: c,
      color: randomColor(),
      walls: createWalls(),
      isMechanism: false,
      mechanismId: null,
    }))
  );

  generateMazePaths(cells, size);

  const entrance = { row: 0, col: 0 };
  const exit = { row: size - 1, col: size - 1 };
  cells[entrance.row][entrance.col].walls.top = false;
  cells[exit.row][exit.col].walls.bottom = false;

  const mechanisms = createMechanisms(cells, size);
  addMechanismWalls(cells, mechanisms);

  return { cells, entrance, exit, mechanisms, size };
}
