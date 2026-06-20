import { MazeData, MazeCell, CELL_SIZE } from './types';

enum CellType {
  WALL = 0,
  PASSAGE = 1,
  UNVISITED = 2
}

export class MazeGenerator {
  private width: number;
  private height: number;
  private grid: CellType[][];

  constructor(minSize: number = 10, maxSize: number = 20) {
    const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
    this.width = size;
    this.height = size;
    this.grid = [];
  }

  generate(level: number = 1): MazeData {
    const baseSize = Math.min(10 + level * 2, 20);
    this.width = baseSize;
    this.height = baseSize;
    
    if (this.width % 2 === 0) this.width++;
    if (this.height % 2 === 0) this.height++;

    this.grid = [];
    for (let z = 0; z < this.height; z++) {
      this.grid[z] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[z][x] = CellType.WALL;
      }
    }

    this.generateBacktracking(1, 1);

    this.createExtraPassages(level);

    const walls: MazeCell[] = [];
    const passages: MazeCell[] = [];

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[z][x] === CellType.WALL) {
          walls.push({ x, z });
        } else {
          passages.push({ x, z });
        }
      }
    }

    const startPos = this.findStartPosition();

    return {
      width: this.width,
      height: this.height,
      walls,
      passages,
      startPos: {
        x: (startPos.x - this.width / 2) * CELL_SIZE,
        z: (startPos.z - this.height / 2) * CELL_SIZE
      }
    };
  }

  private generateBacktracking(startX: number, startZ: number): void {
    const stack: { x: number; z: number }[] = [];
    this.grid[startZ][startX] = CellType.PASSAGE;
    stack.push({ x: startX, z: startZ });

    const directions = [
      { dx: 0, dz: -2 },
      { dx: 2, dz: 0 },
      { dx: 0, dz: 2 },
      { dx: -2, dz: 0 }
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const shuffled = this.shuffleArray(directions);
      let found = false;

      for (const dir of shuffled) {
        const nx = current.x + dir.dx;
        const nz = current.z + dir.dz;

        if (this.isValidCell(nx, nz) && this.grid[nz][nx] === CellType.WALL) {
          const midX = current.x + dir.dx / 2;
          const midZ = current.z + dir.dz / 2;
          this.grid[midZ][midX] = CellType.PASSAGE;
          this.grid[nz][nx] = CellType.PASSAGE;
          stack.push({ x: nx, z: nz });
          found = true;
          break;
        }
      }

      if (!found) {
        stack.pop();
      }
    }
  }

  private createExtraPassages(level: number): void {
    const extraCount = Math.floor(level * 1.5) + 3;
    let created = 0;
    let attempts = 0;

    while (created < extraCount && attempts < 200) {
      attempts++;
      const x = Math.floor(Math.random() * (this.width - 2)) + 1;
      const z = Math.floor(Math.random() * (this.height - 2)) + 1;

      if (this.grid[z][x] === CellType.WALL) {
        let horizontalPassages = 0;
        let verticalPassages = 0;

        if (x > 0 && this.grid[z][x - 1] === CellType.PASSAGE) horizontalPassages++;
        if (x < this.width - 1 && this.grid[z][x + 1] === CellType.PASSAGE) horizontalPassages++;
        if (z > 0 && this.grid[z - 1][x] === CellType.PASSAGE) verticalPassages++;
        if (z < this.height - 1 && this.grid[z + 1][x] === CellType.PASSAGE) verticalPassages++;

        if ((horizontalPassages === 2 && verticalPassages === 0) ||
            (verticalPassages === 2 && horizontalPassages === 0)) {
          this.grid[z][x] = CellType.PASSAGE;
          created++;
        }
      }
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private isValidCell(x: number, z: number): boolean {
    return x > 0 && x < this.width - 1 && z > 0 && z < this.height - 1;
  }

  private findStartPosition(): MazeCell {
    for (let z = 1; z < this.height - 1; z++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.grid[z][x] === CellType.PASSAGE) {
          return { x, z };
        }
      }
    }
    return { x: 1, z: 1 };
  }

  getRandomPassage(mazeData: MazeData, excludePositions: MazeCell[] = [], minDistance: number = 3): MazeCell | null {
    const validPassages = mazeData.passages.filter(p => {
      for (const excl of excludePositions) {
        const dist = Math.abs(p.x - excl.x) + Math.abs(p.z - excl.z);
        if (dist < minDistance) return false;
      }
      return true;
    });

    if (validPassages.length === 0) {
      if (mazeData.passages.length === 0) return null;
      return mazeData.passages[Math.floor(Math.random() * mazeData.passages.length)];
    }

    return validPassages[Math.floor(Math.random() * validPassages.length)];
  }

  gridToWorld(gridX: number, gridZ: number, mazeData: MazeData): { x: number; z: number } {
    return {
      x: (gridX - mazeData.width / 2) * CELL_SIZE,
      z: (gridZ - mazeData.height / 2) * CELL_SIZE
    };
  }

  worldToGrid(worldX: number, worldZ: number, mazeData: MazeData): { x: number; z: number } {
    return {
      x: Math.round(worldX / CELL_SIZE + mazeData.width / 2),
      z: Math.round(worldZ / CELL_SIZE + mazeData.height / 2)
    };
  }

  isWall(worldX: number, worldZ: number, mazeData: MazeData): boolean {
    const grid = this.worldToGrid(worldX, worldZ, mazeData);
    if (grid.x < 0 || grid.x >= mazeData.width || grid.z < 0 || grid.z >= mazeData.height) {
      return true;
    }
    return mazeData.walls.some(w => w.x === grid.x && w.z === grid.z);
  }
}
