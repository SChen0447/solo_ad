export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface Coin {
  gridX: number;
  gridY: number;
  collected: boolean;
  rotation: number;
}

export class Maze {
  public gridSize: number;
  public cellSize: number = 0;
  public grid: Cell[][] = [];
  public coins: Coin[] = [];
  public startX: number = 1;
  public startY: number = 1;
  public endX: number = 0;
  public endY: number = 0;
  public offsetX: number = 0;
  public offsetY: number = 0;

  constructor(gridSize: number) {
    this.gridSize = gridSize;
    this.endX = gridSize - 2;
    this.endY = gridSize - 2;
    this.generate();
  }

  private generate(): void {
    this.grid = [];
    for (let y = 0; y < this.gridSize; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push({
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false
        });
      }
      this.grid.push(row);
    }

    const stack: Cell[] = [];
    const start = this.grid[1][1];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWall(current, next);
        next.visited = true;
        stack.push(next);
      }
    }

    this.generateCoins();
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const { x, y } = cell;
    if (y > 1 && !this.grid[y - 1][x].visited) neighbors.push(this.grid[y - 1][x]);
    if (x < this.gridSize - 2 && !this.grid[y][x + 1].visited) neighbors.push(this.grid[y][x + 1]);
    if (y < this.gridSize - 2 && !this.grid[y + 1][x].visited) neighbors.push(this.grid[y + 1][x]);
    if (x > 1 && !this.grid[y][x - 1].visited) neighbors.push(this.grid[y][x - 1]);
    return neighbors;
  }

  private removeWall(current: Cell, next: Cell): void {
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    if (dx === 1) {
      current.walls.right = false;
      next.walls.left = false;
    } else if (dx === -1) {
      current.walls.left = false;
      next.walls.right = false;
    }
    if (dy === 1) {
      current.walls.bottom = false;
      next.walls.top = false;
    } else if (dy === -1) {
      current.walls.top = false;
      next.walls.bottom = false;
    }
  }

  private generateCoins(): void {
    this.coins = [];
    const totalCoins = Math.floor(this.gridSize * this.gridSize * 0.08);
    const positions = new Set<string>();
    positions.add(`${this.startX},${this.startY}`);
    positions.add(`${this.endX},${this.endY}`);

    while (this.coins.length < totalCoins) {
      const cx = Math.floor(Math.random() * (this.gridSize - 2)) + 1;
      const cy = Math.floor(Math.random() * (this.gridSize - 2)) + 1;
      const key = `${cx},${cy}`;
      if (!positions.has(key)) {
        positions.add(key);
        this.coins.push({ gridX: cx, gridY: cy, collected: false, rotation: 0 });
      }
    }
  }

  public calculateCellSize(canvasWidth: number, canvasHeight: number): void {
    const maxSize = Math.min(canvasWidth, canvasHeight) * 0.85;
    this.cellSize = Math.floor(maxSize / this.gridSize);
    this.offsetX = (canvasWidth - this.cellSize * this.gridSize) / 2;
    this.offsetY = (canvasHeight - this.cellSize * this.gridSize) / 2;
  }

  public getCellAt(px: number, py: number): Cell | null {
    const gx = Math.floor((px - this.offsetX) / this.cellSize);
    const gy = Math.floor((py - this.offsetY) / this.cellSize);
    if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
      return this.grid[gy][gx];
    }
    return null;
  }

  public isWallAt(px: number, py: number, radius: number): { collision: boolean; normalX: number; normalY: number } {
    const checks = [
      { x: px - radius, y: py - radius },
      { x: px + radius, y: py - radius },
      { x: px - radius, y: py + radius },
      { x: px + radius, y: py + radius },
      { x: px, y: py - radius },
      { x: px + radius, y: py },
      { x: px, y: py + radius },
      { x: px - radius, y: py }
    ];

    for (const check of checks) {
      const cell = this.getCellAt(check.x, check.y);
      if (!cell) {
        return { collision: true, normalX: 0, normalY: 0 };
      }
    }

    const gx = Math.floor((px - this.offsetX) / this.cellSize);
    const gy = Math.floor((py - this.offsetY) / this.cellSize);
    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize) {
      return { collision: true, normalX: 0, normalY: 0 };
    }

    const cell = this.grid[gy][gx];
    const localX = (px - this.offsetX) % this.cellSize;
    const localY = (py - this.offsetY) % this.cellSize;

    if (cell.walls.top && localY - radius < 0) {
      return { collision: true, normalX: 0, normalY: 1 };
    }
    if (cell.walls.bottom && localY + radius > this.cellSize) {
      return { collision: true, normalX: 0, normalY: -1 };
    }
    if (cell.walls.left && localX - radius < 0) {
      return { collision: true, normalX: 1, normalY: 0 };
    }
    if (cell.walls.right && localX + radius > this.cellSize) {
      return { collision: true, normalX: -1, normalY: 0 };
    }

    return { collision: false, normalX: 0, normalY: 0 };
  }

  public updateCoins(dt: number): void {
    for (const coin of this.coins) {
      if (!coin.collected) {
        coin.rotation += dt * 3;
      }
    }
  }

  public checkCoinCollision(px: number, py: number, radius: number): number {
    let score = 0;
    for (const coin of this.coins) {
      if (coin.collected) continue;
      const coinX = this.offsetX + coin.gridX * this.cellSize + this.cellSize / 2;
      const coinY = this.offsetY + coin.gridY * this.cellSize + this.cellSize / 2;
      const dx = px - coinX;
      const dy = py - coinY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + this.cellSize * 0.25) {
        coin.collected = true;
        score += 10;
      }
    }
    return score;
  }

  public checkGoalReached(px: number, py: number, radius: number): boolean {
    const goalX = this.offsetX + this.endX * this.cellSize + this.cellSize / 2;
    const goalY = this.offsetY + this.endY * this.cellSize + this.cellSize / 2;
    const dx = px - goalX;
    const dy = py - goalY;
    return Math.sqrt(dx * dx + dy * dy) < radius + this.cellSize * 0.3;
  }

  public getStartPosition(): { x: number; y: number } {
    return {
      x: this.offsetX + this.startX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + this.startY * this.cellSize + this.cellSize / 2
    };
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    const neonGlow = 0.5 + Math.sin(time * Math.PI) * 0.3;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const cell = this.grid[y][x];
        const cx = this.offsetX + x * this.cellSize;
        const cy = this.offsetY + y * this.cellSize;

        const gradient = ctx.createLinearGradient(cx, cy, cx + this.cellSize, cy + this.cellSize);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(cx, cy, this.cellSize, this.cellSize);

        ctx.strokeStyle = `rgba(0, 180, 255, ${0.4 + neonGlow * 0.4})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00b4ff';

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + this.cellSize, cy);
          ctx.stroke();
        }
        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(cx + this.cellSize, cy);
          ctx.lineTo(cx + this.cellSize, cy + this.cellSize);
          ctx.stroke();
        }
        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(cx, cy + this.cellSize);
          ctx.lineTo(cx + this.cellSize, cy + this.cellSize);
          ctx.stroke();
        }
        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy + this.cellSize);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
    }

    this.renderCoins(ctx, time);
    this.renderStartAndGoal(ctx, time);
  }

  private renderCoins(ctx: CanvasRenderingContext2D, time: number): void {
    for (const coin of this.coins) {
      if (coin.collected) continue;
      const cx = this.offsetX + coin.gridX * this.cellSize + this.cellSize / 2;
      const cy = this.offsetY + coin.gridY * this.cellSize + this.cellSize / 2;
      const blink = 0.7 + Math.sin(time * Math.PI * 2) * 0.3;
      const size = this.cellSize * 0.3;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(coin.rotation);

      ctx.shadowBlur = 15 * blink;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = `rgba(255, 215, 0, ${blink})`;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? size : size * 0.45;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private renderStartAndGoal(ctx: CanvasRenderingContext2D, time: number): void {
    const pulse = 0.6 + Math.sin(time * Math.PI) * 0.4;

    const sx = this.offsetX + this.startX * this.cellSize + this.cellSize / 2;
    const sy = this.offsetY + this.startY * this.cellSize + this.cellSize / 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ff88';
    ctx.fillStyle = `rgba(0, 255, 136, ${0.5 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(sx, sy, this.cellSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const gx = this.offsetX + this.endX * this.cellSize + this.cellSize / 2;
    const gy = this.offsetY + this.endY * this.cellSize + this.cellSize / 2;
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#ff00ff';
    ctx.fillStyle = `rgba(255, 0, 255, ${0.6 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(gx, gy, this.cellSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 200, 255, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gx, gy, this.cellSize * 0.35 + Math.sin(time * Math.PI * 2) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
