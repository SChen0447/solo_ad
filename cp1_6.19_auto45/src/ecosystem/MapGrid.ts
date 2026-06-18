import { GridCellData, GrowthStage } from '../types';

export class MapGrid {
  readonly width = 100;
  readonly height = 100;
  private grid: GridCellData[][];

  constructor() {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = {
          speciesId: null,
          growthStage: 0,
          colonyId: null,
          lastCollected: 0,
          growthProgress: 0,
        };
      }
    }
  }

  getCell(x: number, y: number): GridCellData | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.grid[y][x];
  }

  setCell(x: number, y: number, data: Partial<GridCellData>): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.grid[y][x] = { ...this.grid[y][x], ...data };
  }

  getNeighbors(x: number, y: number): { x: number; y: number; cell: GridCellData }[] {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    const result: { x: number; y: number; cell: GridCellData }[] = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const cell = this.getCell(nx, ny);
      if (cell) result.push({ x: nx, y: ny, cell });
    }
    return result;
  }

  getCardinalNeighbors(x: number, y: number): { x: number; y: number; cell: GridCellData }[] {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const result: { x: number; y: number; cell: GridCellData }[] = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const cell = this.getCell(nx, ny);
      if (cell) result.push({ x: nx, y: ny, cell });
    }
    return result;
  }

  collectCell(x: number, y: number): number | null {
    const cell = this.getCell(x, y);
    if (!cell || cell.speciesId === null || cell.growthStage < 2) return null;
    const speciesId = cell.speciesId;
    this.setCell(x, y, {
      speciesId: null,
      growthStage: 0,
      colonyId: null,
      lastCollected: Date.now(),
      growthProgress: 0,
    });
    return speciesId;
  }

  regenerateCells(now: number): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        if (cell.speciesId === null && cell.lastCollected > 0) {
          if (now - cell.lastCollected >= 30000) {
            const neighbors = this.getCardinalNeighbors(x, y);
            const occupiedNeighbors = neighbors.filter(n => n.cell.speciesId !== null);
            if (occupiedNeighbors.length > 0) {
              const dominant = this.getDominantSpecies(occupiedNeighbors.map(n => n.cell));
              this.grid[y][x] = {
                speciesId: dominant,
                growthStage: 1 as GrowthStage,
                colonyId: occupiedNeighbors[0].cell.colonyId,
                lastCollected: 0,
                growthProgress: 0.1,
              };
            } else {
              this.grid[y][x] = {
                speciesId: null,
                growthStage: 0,
                colonyId: null,
                lastCollected: 0,
                growthProgress: 0,
              };
            }
          }
        }
      }
    }
  }

  private getDominantSpecies(cells: GridCellData[]): number {
    const counts: Record<number, number> = {};
    for (const c of cells) {
      if (c.speciesId !== null) {
        counts[c.speciesId] = (counts[c.speciesId] || 0) + 1;
      }
    }
    let maxCount = 0;
    let dominant = 0;
    for (const [id, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = Number(id);
      }
    }
    return dominant;
  }

  getAllCells(): GridCellData[][] {
    return this.grid;
  }

  getColonyCells(colonyId: number): { x: number; y: number }[] {
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].colonyId === colonyId) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }
}
