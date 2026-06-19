export type CellType = 0 | 1;
export type MazeGrid = CellType[][];

export interface Point {
  x: number;
  y: number;
}

export interface MazeResult {
  grid: MazeGrid;
  width: number;
  height: number;
  entrance: Point;
  exit: Point;
}

const FLOOR: CellType = 0;
const WALL: CellType = 1;

export class MazeGenerator {
  generate(width: number, height: number): MazeResult {
    const startTime = performance.now();

    const gridWidth = this.makeOdd(width);
    const gridHeight = this.makeOdd(height);

    const grid: MazeGrid = this.createWallGrid(gridWidth, gridHeight);

    const startX = 1;
    const startY = 1;
    grid[startY][startX] = FLOOR;

    const stack: Point[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();
    visited.add(`${startX},${startY}`);

    const directions = [
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 }
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: { x: number; y: number; mx: number; my: number }[] = [];

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const key = `${nx},${ny}`;

        if (
          nx > 0 &&
          nx < gridWidth - 1 &&
          ny > 0 &&
          ny < gridHeight - 1 &&
          !visited.has(key)
        ) {
          const mx = current.x + dir.dx / 2;
          const my = current.y + dir.dy / 2;
          neighbors.push({ x: nx, y: ny, mx, my });
        }
      }

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[next.my][next.mx] = FLOOR;
        grid[next.y][next.x] = FLOOR;
        visited.add(`${next.x},${next.y}`);
        stack.push({ x: next.x, y: next.y });
      } else {
        stack.pop();
      }
    }

    this.removeDeadEnds(grid, gridWidth, gridHeight);

    const entrance: Point = { x: 1, y: 0 };
    const exit: Point = { x: gridWidth - 2, y: gridHeight - 1 };
    grid[entrance.y][entrance.x] = FLOOR;
    grid[exit.y][exit.x] = FLOOR;

    const endTime = performance.now();
    console.log(`迷宫生成耗时: ${(endTime - startTime).toFixed(2)}ms`);

    return {
      grid,
      width: gridWidth,
      height: gridHeight,
      entrance,
      exit
    };
  }

  private makeOdd(n: number): number {
    return n % 2 === 0 ? n + 1 : n;
  }

  private createWallGrid(width: number, height: number): MazeGrid {
    const grid: MazeGrid = [];
    for (let y = 0; y < height; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < width; x++) {
        row.push(WALL);
      }
      grid.push(row);
    }
    return grid;
  }

  private removeDeadEnds(grid: MazeGrid, width: number, height: number): void {
    let modified = true;
    while (modified) {
      modified = false;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (grid[y][x] === FLOOR) {
            const wallCount = this.countAdjacentWalls(grid, x, y);
            if (wallCount === 3) {
              const dirs = [
                { dx: 0, dy: -1 },
                { dx: 1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }
              ];
              for (const dir of dirs) {
                const nx = x + dir.dx;
                const ny = y + dir.dy;
                if (
                  nx > 0 &&
                  nx < width - 1 &&
                  ny > 0 &&
                  ny < height - 1 &&
                  grid[ny][nx] === WALL
                ) {
                  const opposite = {
                    dx: -dir.dx,
                    dy: -dir.dy
                  };
                  const checkX = x + opposite.dx;
                  const checkY = y + opposite.dy;
                  if (grid[checkY][checkX] === FLOOR) {
                    grid[ny][nx] = FLOOR;
                    modified = true;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private countAdjacentWalls(grid: MazeGrid, x: number, y: number): number {
    let count = 0;
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];
    for (const dir of dirs) {
      if (grid[y + dir.dy][x + dir.dx] === WALL) {
        count++;
      }
    }
    return count;
  }

  isPath(grid: MazeGrid, x: number, y: number): boolean {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) {
      return false;
    }
    return grid[y][x] === FLOOR;
  }

  arePointsAdjacent(p1: Point, p2: Point): boolean {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }
}
