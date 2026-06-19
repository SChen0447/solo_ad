export interface ObstacleConfig {
  gridSize: number;
  count: number;
  speedMultiplier: number;
}

export type ObstacleCollisionCallback = () => void;

export class Obstacle {
  public x: number = 0;
  public y: number = 0;
  public size: number = 0;
  public minX: number = 0;
  public maxX: number = 0;
  private _speed: number = 0;
  public direction: number = 1;

  constructor(x: number, y: number, size: number, minX: number, maxX: number, speed: number) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.minX = minX;
    this.maxX = maxX;
    this._speed = speed;
    this.direction = Math.random() > 0.5 ? 1 : -1;
  }

  get speed(): number {
    return this._speed;
  }

  set speed(value: number) {
    this._speed = Math.max(0, value);
  }

  public update(dt: number): void {
    this.x += this.direction * this.speed * dt;
    if (this.x <= this.minX) {
      this.x = this.minX;
      this.direction = 1;
    } else if (this.x + this.size >= this.maxX) {
      this.x = this.maxX - this.size;
      this.direction = -1;
    }
  }

  public checkCollision(px: number, py: number, radius: number): boolean {
    const closestX = Math.max(this.x, Math.min(px, this.x + this.size));
    const closestY = Math.max(this.y, Math.min(py, this.y + this.size));
    const dx = px - closestX;
    const dy = py - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    const pulse = 0.7 + Math.sin(time * Math.PI * 2) * 0.3;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(255, 0, 0, ${pulse})`;

    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.size);
    gradient.addColorStop(0, '#ff4444');
    gradient.addColorStop(0.5, '#dd0000');
    gradient.addColorStop(1, '#880000');

    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, this.y, this.size, this.size);

    ctx.strokeStyle = `rgba(255, 100, 100, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.size, this.size);

    ctx.shadowBlur = 0;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    ctx.fillStyle = `rgba(255, 200, 200, ${0.4 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx, cy, this.size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class ObstacleManager {
  public obstacles: Obstacle[] = [];
  public onCollision: ObstacleCollisionCallback | null = null;
  private _speedMultiplier: number = 1;

  public generate(maze: { gridSize: number; cellSize: number; offsetX: number; offsetY: number; grid: { walls: { top: boolean; right: boolean; bottom: boolean; left: boolean } }[][] }, config: ObstacleConfig): void {
    this.obstacles = [];
    const size = maze.cellSize * 0.5;
    const baseSpeed = 60 * config.speedMultiplier;

    const positions: { gx: number; gy: number }[] = [];

    for (let y = 1; y < maze.gridSize - 1; y++) {
      for (let x = 1; x < maze.gridSize - 1; x++) {
        const cell = maze.grid[y][x];
        const hasLeft = x > 1 && !cell.walls.left && !maze.grid[y][x - 1].walls.right;
        const hasRight = x < maze.gridSize - 2 && !cell.walls.right && !maze.grid[y][x + 1].walls.left;
        if (hasLeft && hasRight) {
          positions.push({ gx: x, gy: y });
        }
      }
    }

    positions.sort(() => Math.random() - 0.5);
    const count = Math.min(config.count, positions.length);

    for (let i = 0; i < count; i++) {
      const pos = positions[i];
      if ((pos.gx === 1 && pos.gy === 1) || (pos.gx === maze.gridSize - 2 && pos.gy === maze.gridSize - 2)) {
        continue;
      }

      let minGX = pos.gx;
      let maxGX = pos.gx;

      while (minGX > 1 && !maze.grid[pos.gy][minGX].walls.left) {
        minGX--;
      }
      while (maxGX < maze.gridSize - 2 && !maze.grid[pos.gy][maxGX].walls.right) {
        maxGX++;
      }

      if (maxGX - minGX < 1) continue;

      const minX = maze.offsetX + minGX * maze.cellSize + 2;
      const maxX = maze.offsetX + (maxGX + 1) * maze.cellSize - 2;
      const obY = maze.offsetY + pos.gy * maze.cellSize + (maze.cellSize - size) / 2;
      const obX = maze.offsetX + pos.gx * maze.cellSize + (maze.cellSize - size) / 2;
      const speed = baseSpeed * (0.7 + Math.random() * 0.6);

      this.obstacles.push(new Obstacle(obX, obY, size, minX, maxX, speed));
    }
  }

  get speedMultiplier(): number {
    return this._speedMultiplier;
  }

  set speedMultiplier(value: number) {
    this._speedMultiplier = Math.max(0, value);
  }

  public update(dt: number): void {
    for (const obs of this.obstacles) {
      obs.update(dt * this._speedMultiplier);
    }
  }

  public checkCollision(px: number, py: number, radius: number): boolean {
    for (const obs of this.obstacles) {
      if (obs.checkCollision(px, py, radius)) {
        if (this.onCollision) {
          this.onCollision();
        }
        return true;
      }
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D, time: number): void {
    for (const obs of this.obstacles) {
      obs.render(ctx, time);
    }
  }
}
