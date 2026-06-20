export type CellType = 'wall' | 'path';

export interface Cell {
  x: number;
  y: number;
  type: CellType;
}

export interface MazeData {
  grid: CellType[][];
  rows: number;
  cols: number;
  start: { x: number; y: number };
  exit: { x: number; y: number };
  paths: { x: number; y: number }[];
  fragments: { x: number; y: number }[];
  seed: number;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export class MazeEngine {
  private rng: SeededRandom;
  private rows: number;
  private cols: number;
  private grid: CellType[][];

  constructor(seed: number, rows: number = 8, cols: number = 8) {
    this.rng = new SeededRandom(seed);
    this.rows = rows;
    this.cols = cols;
    this.grid = [];
  }

  generate(): MazeData {
    const gridRows = this.rows * 2 + 1;
    const gridCols = this.cols * 2 + 1;

    this.grid = Array.from({ length: gridRows }, () =>
      Array.from({ length: gridCols }, () => 'wall' as CellType)
    );

    const visited = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );

    this.carve(0, 0, visited);

    this.ensureConnectivity();

    const start = { x: 1, y: 1 };
    const exit = { x: gridCols - 2, y: gridRows - 2 };

    if (this.grid[exit.y] && this.grid[exit.y][exit.x] === 'wall') {
      this.grid[exit.y][exit.x] = 'path';
      if (exit.y > 0) this.grid[exit.y - 1][exit.x] = 'path';
      if (exit.x > 0) this.grid[exit.y][exit.x - 1] = 'path';
    }

    const paths = this.collectPaths();

    const fragments = this.placeFragments(paths, start, exit, 10);

    return {
      grid: this.grid,
      rows: gridRows,
      cols: gridCols,
      start,
      exit,
      paths,
      fragments,
      seed: this.rng.nextInt(1, 999999),
    };
  }

  private carve(row: number, col: number, visited: boolean[][]): void {
    visited[row][col] = true;

    const gridY = row * 2 + 1;
    const gridX = col * 2 + 1;
    this.grid[gridY][gridX] = 'path';

    const directions = this.rng.shuffle([
      { dr: -1, dc: 0, wr: -1, wc: 0 },
      { dr: 1, dc: 0, wr: 1, wc: 0 },
      { dr: 0, dc: -1, wr: 0, wc: -1 },
      { dr: 0, dc: 1, wr: 0, wc: 1 },
    ]);

    for (const dir of directions) {
      const newRow = row + dir.dr;
      const newCol = col + dir.dc;

      if (
        newRow >= 0 &&
        newRow < this.rows &&
        newCol >= 0 &&
        newCol < this.cols &&
        !visited[newRow][newCol]
      ) {
        const wallY = gridY + dir.wr;
        const wallX = gridX + dir.wc;
        if (this.grid[wallY] && this.grid[wallY][wallX] !== undefined) {
          this.grid[wallY][wallX] = 'path';
        }
        this.carve(newRow, newCol, visited);
      }
    }
  }

  private ensureConnectivity(): void {
    for (let y = 1; y < this.grid.length - 1; y++) {
      for (let x = 1; x < this.grid[0].length - 1; x++) {
        if (this.grid[y][x] === 'wall') {
          const neighbors = [
            this.grid[y - 1]?.[x],
            this.grid[y + 1]?.[x],
            this.grid[y]?.[x - 1],
            this.grid[y]?.[x + 1],
          ].filter((c) => c === 'path').length;

          if (neighbors >= 3 && this.rng.next() < 0.15) {
            this.grid[y][x] = 'path';
          }
        }
      }
    }
  }

  private collectPaths(): { x: number; y: number }[] {
    const paths: { x: number; y: number }[] = [];
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[0].length; x++) {
        if (this.grid[y][x] === 'path') {
          paths.push({ x, y });
        }
      }
    }
    return paths;
  }

  private placeFragments(
    paths: { x: number; y: number }[],
    start: { x: number; y: number },
    exit: { x: number; y: number },
    count: number
  ): { x: number; y: number }[] {
    const shuffled = this.rng.shuffle(paths.filter(
      (p) => !(p.x === start.x && p.y === start.y) && !(p.x === exit.x && p.y === exit.y)
    ));
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
