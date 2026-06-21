import { ElementType, Cell, GridState, Ripple, GRID_WIDTH, GRID_HEIGHT } from './type';

export class PhysicsEngine {
  private ripples: Ripple[] = [];
  private burnTime: number = 5000;
  private ignitionChance: number = 0.1;

  public update(grid: GridState, deltaTime: number): Ripple[] {
    this.ripples = [];
    this.resetUpdatedFlags(grid);

    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
      const startX = y % 2 === 0 ? 0 : GRID_WIDTH - 1;
      const endX = y % 2 === 0 ? GRID_WIDTH : -1;
      const step = y % 2 === 0 ? 1 : -1;

      for (let x = startX; x !== endX; x += step) {
        const cell = grid.cells[y][x];
        if (cell.updated || cell.type === ElementType.EMPTY) continue;

        this.updateCell(grid, x, y, cell, deltaTime);
      }
    }

    return this.ripples;
  }

  private resetUpdatedFlags(grid: GridState): void {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        grid.cells[y][x].updated = false;
      }
    }
  }

  private updateCell(grid: GridState, x: number, y: number, cell: Cell, deltaTime: number): void {
    switch (cell.type) {
      case ElementType.SAND:
        this.updateSand(grid, x, y, cell);
        break;
      case ElementType.WATER:
        this.updateWater(grid, x, y, cell);
        break;
      case ElementType.FIRE:
        this.updateFire(grid, x, y, cell, deltaTime);
        break;
      case ElementType.SMOKE:
        this.updateSmoke(grid, x, y, cell, deltaTime);
        break;
      case ElementType.STEAM:
        this.updateSteam(grid, x, y, cell, deltaTime);
        break;
      case ElementType.WOOD:
        this.updateWood(grid, x, y, cell, deltaTime);
        break;
      case ElementType.ASH:
        this.updateAsh(grid, x, y, cell);
        break;
    }
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
  }

  private swapCells(grid: GridState, x1: number, y1: number, x2: number, y2: number): void {
    const temp = grid.cells[y1][x1];
    grid.cells[y1][x1] = grid.cells[y2][x2];
    grid.cells[y2][x2] = temp;
    grid.cells[y1][x1].updated = true;
    grid.cells[y2][x2].updated = true;
  }

  private setCell(grid: GridState, x: number, y: number, type: ElementType): void {
    const cell = grid.cells[y][x];
    cell.type = type;
    cell.lifetime = 0;
    cell.burnTimer = 0;
    cell.velocityX = 0;
    cell.velocityY = 0;
    cell.opacity = type === ElementType.EMPTY ? 0 : 1;
    cell.updated = true;
  }

  private updateSand(grid: GridState, x: number, y: number, cell: Cell): void {
    if (y >= GRID_HEIGHT - 1) {
      cell.updated = true;
      return;
    }

    const below = grid.cells[y + 1][x];

    if (below.type === ElementType.WATER) {
      this.ripples.push({
        x: x,
        y: y + 1,
        radius: 0,
        maxRadius: 8,
        alpha: 1
      });
      this.swapCells(grid, x, y, x, y + 1);
      return;
    }

    if (below.type === ElementType.EMPTY) {
      this.swapCells(grid, x, y, x, y + 1);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    const diagLeft = this.isInBounds(x - dir, y + 1) ? grid.cells[y + 1][x - dir] : null;
    const diagRight = this.isInBounds(x + dir, y + 1) ? grid.cells[y + 1][x + dir] : null;

    if (diagLeft && (diagLeft.type === ElementType.EMPTY || diagLeft.type === ElementType.WATER)) {
      if (diagLeft.type === ElementType.WATER) {
        this.ripples.push({
          x: x - dir,
          y: y + 1,
          radius: 0,
          maxRadius: 8,
          alpha: 1
        });
      }
      this.swapCells(grid, x, y, x - dir, y + 1);
      return;
    }

    if (diagRight && (diagRight.type === ElementType.EMPTY || diagRight.type === ElementType.WATER)) {
      if (diagRight.type === ElementType.WATER) {
        this.ripples.push({
          x: x + dir,
          y: y + 1,
          radius: 0,
          maxRadius: 8,
          alpha: 1
        });
      }
      this.swapCells(grid, x, y, x + dir, y + 1);
      return;
    }

    cell.updated = true;
  }

  private updateWater(grid: GridState, x: number, y: number, cell: Cell): void {
    if (y < GRID_HEIGHT - 1) {
      const below = grid.cells[y + 1][x];
      if (below.type === ElementType.EMPTY) {
        this.swapCells(grid, x, y, x, y + 1);
        return;
      }
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    for (const d of [dir, -dir]) {
      const nx = x + d;
      if (!this.isInBounds(nx, y)) continue;

      const neighbor = grid.cells[y][nx];
      if (neighbor.type === ElementType.EMPTY) {
        this.swapCells(grid, x, y, nx, y);
        return;
      }

      if (y < GRID_HEIGHT - 1) {
        const diag = grid.cells[y + 1][nx];
        if (diag.type === ElementType.EMPTY) {
          this.swapCells(grid, x, y, nx, y + 1);
          return;
        }
      }
    }

    cell.updated = true;
  }

  private updateFire(grid: GridState, x: number, y: number, cell: Cell, deltaTime: number): void {
    cell.lifetime += deltaTime;
    if (cell.lifetime > 3000 + Math.random() * 2000) {
      this.setCell(grid, x, y, ElementType.EMPTY);
      return;
    }

    if (y > 0) {
      const above = grid.cells[y - 1][x];
      if (above.type === ElementType.EMPTY && Math.random() < 0.3) {
        this.setCell(grid, x, y - 1, ElementType.SMOKE);
        grid.cells[y - 1][x].opacity = 0.7;
      }
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!this.isInBounds(nx, ny)) continue;

        const neighbor = grid.cells[ny][nx];

        if (neighbor.type === ElementType.WATER) {
          this.setCell(grid, x, y, ElementType.EMPTY);
          if (Math.random() < 0.5 && y > 0) {
            const above = grid.cells[y - 1][x];
            if (above.type === ElementType.EMPTY) {
              this.setCell(grid, x, y - 1, ElementType.STEAM);
            }
          }
          return;
        }

        if (neighbor.type === ElementType.WOOD && Math.random() < this.ignitionChance) {
          neighbor.burnTimer = this.burnTime;
        }
      }
    }

    cell.updated = true;
  }

  private updateSmoke(grid: GridState, x: number, y: number, cell: Cell, deltaTime: number): void {
    cell.lifetime += deltaTime;
    cell.opacity = Math.max(0, 1 - cell.lifetime / 8000);

    if (cell.lifetime > 8000) {
      this.setCell(grid, x, y, ElementType.EMPTY);
      return;
    }

    if (y > 0 && Math.random() < 0.6) {
      const above = grid.cells[y - 1][x];
      if (above.type === ElementType.EMPTY) {
        this.swapCells(grid, x, y, x, y - 1);
        return;
      }

      const dir = Math.random() < 0.5 ? -1 : 1;
      if (this.isInBounds(x + dir, y - 1)) {
        const diag = grid.cells[y - 1][x + dir];
        if (diag.type === ElementType.EMPTY) {
          this.swapCells(grid, x, y, x + dir, y - 1);
          return;
        }
      }
    }

    cell.updated = true;
  }

  private updateSteam(grid: GridState, x: number, y: number, cell: Cell, deltaTime: number): void {
    cell.lifetime += deltaTime;
    cell.opacity = Math.max(0, 1 - cell.lifetime / 3000);

    if (cell.lifetime > 3000) {
      this.setCell(grid, x, y, ElementType.EMPTY);
      return;
    }

    if (y > 0 && Math.random() < 0.8) {
      const above = grid.cells[y - 1][x];
      if (above.type === ElementType.EMPTY) {
        this.swapCells(grid, x, y, x, y - 1);
        return;
      }
    }

    cell.updated = true;
  }

  private updateWood(grid: GridState, x: number, y: number, cell: Cell, deltaTime: number): void {
    if (cell.burnTimer > 0) {
      cell.burnTimer -= deltaTime;
      if (cell.burnTimer <= 0) {
        this.setCell(grid, x, y, ElementType.FIRE);
        return;
      }
    }

    cell.updated = true;
  }

  private updateAsh(grid: GridState, x: number, y: number, cell: Cell): void {
    if (y >= GRID_HEIGHT - 1) {
      cell.updated = true;
      return;
    }

    const below = grid.cells[y + 1][x];
    if (below.type === ElementType.EMPTY) {
      this.swapCells(grid, x, y, x, y + 1);
      return;
    }

    if (below.type === ElementType.WATER) {
      this.ripples.push({
        x: x,
        y: y + 1,
        radius: 0,
        maxRadius: 6,
        alpha: 0.7
      });
      this.swapCells(grid, x, y, x, y + 1);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    const diagLeft = this.isInBounds(x - dir, y + 1) ? grid.cells[y + 1][x - dir] : null;
    const diagRight = this.isInBounds(x + dir, y + 1) ? grid.cells[y + 1][x + dir] : null;

    if (diagLeft && diagLeft.type === ElementType.EMPTY) {
      this.swapCells(grid, x, y, x - dir, y + 1);
      return;
    }

    if (diagRight && diagRight.type === ElementType.EMPTY) {
      this.swapCells(grid, x, y, x + dir, y + 1);
      return;
    }

    cell.updated = true;
  }

  public updateRipples(ripples: Ripple[], deltaTime: number): Ripple[] {
    return ripples
      .map(r => ({
        ...r,
        radius: r.radius + deltaTime / 125,
        alpha: 1 - r.radius / r.maxRadius
      }))
      .filter(r => r.radius < r.maxRadius);
  }
}
