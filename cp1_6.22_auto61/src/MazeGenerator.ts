import { Grid, Position, CONFIG } from './types';

export class MazeGenerator {
  private size: number;
  private grid: Grid;
  private startPosition: Position;
  private endPosition: Position;

  constructor(size: number = CONFIG.MAZE_SIZE) {
    this.size = size;
    this.grid = [];
    this.startPosition = { x: 0, y: 0 };
    this.endPosition = { x: 0, y: 0 };
  }

  public generate(): void {
    this.grid = this.createFullGrid();
    this.carvePassages(1, 1);
    this.setEntranceAndExit();
  }

  private createFullGrid(): Grid {
    const grid: Grid = [];
    for (let y = 0; y < this.size; y++) {
      grid[y] = [];
      for (let x = 0; x < this.size; x++) {
        grid[y][x] = 1;
      }
    }
    return grid;
  }

  private carvePassages(x: number, y: number): void {
    this.grid[y][x] = 0;

    const directions = this.shuffle([
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 },
    ]);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (this.isValidCell(nx, ny) && this.grid[ny][nx] === 1) {
        const mx = x + dir.dx / 2;
        const my = y + dir.dy / 2;
        this.grid[my][mx] = 0;
        this.carvePassages(nx, ny);
      }
    }
  }

  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private setEntranceAndExit(): void {
    this.startPosition = { x: 1, y: 1 };
    this.grid[1][1] = 0;

    this.endPosition = { x: this.size - 2, y: this.size - 2 };
    this.grid[this.size - 2][this.size - 2] = 0;
  }

  public getGrid(): Grid {
    return this.grid;
  }

  public getStartPosition(): Position {
    return this.startPosition;
  }

  public getEndPosition(): Position {
    return this.endPosition;
  }

  public getRandomFragmentPositions(count: number): Position[] {
    const positions: Position[] = [];
    const availablePositions: Position[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (
          this.grid[y][x] === 0 &&
          !(x === this.startPosition.x && y === this.startPosition.y) &&
          !(x === this.endPosition.x && y === this.endPosition.y)
        ) {
          availablePositions.push({ x, y });
        }
      }
    }

    const shuffled = this.shuffle(availablePositions);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      positions.push(shuffled[i]);
    }

    return positions;
  }
}
