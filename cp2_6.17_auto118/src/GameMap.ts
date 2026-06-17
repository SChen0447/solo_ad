import {
  GRID_SIZE,
  CELL_SIZE,
  MAP_LAYOUT,
  PATH_POINTS,
  CellType,
  gridToPixel,
  pixelToGrid
} from './config';
import type { Tower } from './Tower';

export interface GridCell {
  x: number;
  y: number;
  type: CellType;
  tower?: Tower;
}

export class GameMap {
  private grid: GridCell[][];
  private pathPixels: { x: number; y: number }[];

  constructor() {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push({
          x,
          y,
          type: MAP_LAYOUT[y][x],
          tower: undefined
        });
      }
      this.grid.push(row);
    }

    this.pathPixels = PATH_POINTS.map(p => gridToPixel(p.x, p.y));
  }

  getCell(x: number, y: number): GridCell | null {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return null;
    }
    return this.grid[y][x];
  }

  getCellAtPixel(px: number, py: number): GridCell | null {
    const { x, y } = pixelToGrid(px, py);
    return this.getCell(x, y);
  }

  isBuildable(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    return cell !== null && cell.type === 'empty' && !cell.tower;
  }

  placeTower(x: number, y: number, tower: Tower): boolean {
    if (!this.isBuildable(x, y)) {
      return false;
    }
    const cell = this.getCell(x, y)!;
    cell.tower = tower;
    cell.type = 'tower';
    return true;
  }

  removeTower(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell || !cell.tower) return false;
    cell.tower = undefined;
    cell.type = 'empty';
    return true;
  }

  getPathPixels(): { x: number; y: number }[] {
    return this.pathPixels;
  }

  getGrid(): GridCell[][] {
    return this.grid;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.grid[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        switch (cell.type) {
          case 'empty':
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            break;
          case 'path':
          case 'start':
          case 'end':
            ctx.fillStyle = '#aaa';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            break;
          case 'obstacle':
            ctx.fillStyle = '#555';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            break;
          case 'tower':
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            break;
        }
      }
    }

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    for (let i = 0; i < this.pathPixels.length; i++) {
      const p = this.pathPixels[i];
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const start = this.pathPixels[0];
    ctx.fillStyle = '#66ff66';
    ctx.beginPath();
    ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
    ctx.fill();

    const end = this.pathPixels[this.pathPixels.length - 1];
    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    ctx.arc(end.x, end.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBuildHighlight(
    ctx: CanvasRenderingContext2D,
    gridX: number,
    gridY: number,
    canBuild: boolean,
    selectedTowerRange?: { range: number }
  ): void {
    const cell = this.getCell(gridX, gridY);
    if (!cell) return;

    const px = gridX * CELL_SIZE;
    const py = gridY * CELL_SIZE;

    ctx.fillStyle = canBuild ? '#00ff0044' : '#ff000044';
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

    if (canBuild && selectedTowerRange) {
      const center = gridToPixel(gridX, gridY);
      ctx.strokeStyle = '#ffffff55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, selectedTowerRange.range, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
