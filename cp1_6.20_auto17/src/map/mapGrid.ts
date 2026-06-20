import {
  GRID_COLS,
  GRID_ROWS,
  START_GRID,
  END_GRID,
  GridPos,
  gridKey
} from '../types';

// 数据流向：被 towerManager 修改（放置炮塔=障碍物），被 pathFinder 读取（A*障碍物判定）

export class MapGrid {
  private obstacles: Set<string> = new Set();
  private start: GridPos;
  private end: GridPos;

  constructor() {
    this.start = { ...START_GRID };
    this.end = { ...END_GRID };
  }

  getStart(): GridPos {
    return { ...this.start };
  }

  getEnd(): GridPos {
    return { ...this.end };
  }

  isInBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS;
  }

  isObstacle(gx: number, gy: number): boolean {
    return this.obstacles.has(gridKey(gx, gy));
  }

  setObstacle(gx: number, gy: number, isObstacle: boolean): void {
    if (!this.isInBounds(gx, gy)) return;
    if ((gx === this.start.gx && gy === this.start.gy) ||
        (gx === this.end.gx && gy === this.end.gy)) return;

    const key = gridKey(gx, gy);
    if (isObstacle) {
      this.obstacles.add(key);
    } else {
      this.obstacles.delete(key);
    }
  }

  canPlaceTower(gx: number, gy: number): boolean {
    if (!this.isInBounds(gx, gy)) return false;
    if (this.isObstacle(gx, gy)) return false;
    if (gx === this.start.gx && gy === this.start.gy) return false;
    if (gx === this.end.gx && gy === this.end.gy) return false;
    return true;
  }

  getAllObstacles(): Set<string> {
    return new Set(this.obstacles);
  }

  getCols(): number {
    return GRID_COLS;
  }

  getRows(): number {
    return GRID_ROWS;
  }

  reset(): void {
    this.obstacles.clear();
  }
}
