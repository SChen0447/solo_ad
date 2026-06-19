import { Maze } from './maze';

export interface Obstacle {
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  size: number;
  minX: number;
  maxX: number;
  speed: number;
  baseSpeed: number;
  direction: 1 | -1;
  pulsePhase: number;
  cornerRadius: number;
}

export class ObstacleManager {
  public obstacles: Obstacle[] = [];
  private globalSpeedMultiplier: number = 1;
  private baseSpeed: number = 80;

  public setSpeedMultiplier(mult: number): void {
    this.globalSpeedMultiplier = mult;
    for (const obs of this.obstacles) {
      obs.speed = obs.baseSpeed * mult;
    }
  }

  public generate(maze: Maze, level: number): void {
    this.obstacles = [];
    const count = Math.min(3 + level * 2, 15);
    this.baseSpeed = 80 + level * 20;
    this.globalSpeedMultiplier = 1 + (level - 1) * 0.12;

    const horizontalCorridors: Array<{ y: number; startX: number; endX: number }> = [];

    for (let y = 1; y < maze.size - 1; y++) {
      let x = 1;
      while (x < maze.size - 1) {
        if (maze.grid[y][x] === 0) {
          let startX = x;
          while (x < maze.size - 1 && maze.grid[y][x] === 0) {
            x++;
          }
          const length = x - startX;
          if (length >= 4) {
            const aboveIsWall = y - 1 >= 0 && maze.grid[y - 1][startX] === 1;
            const belowIsWall = y + 1 < maze.size && maze.grid[y + 1][startX] === 1;
            if (aboveIsWall || belowIsWall) {
              horizontalCorridors.push({ y, startX, endX: x - 1 });
            }
          }
        } else {
          x++;
        }
      }
    }

    const usedPositions = new Set<string>();
    const candidates = horizontalCorridors.filter(
      (c) => !(c.y === maze.startY && c.startX <= maze.startX && c.endX >= maze.startX) &&
             !(c.y === maze.endY && c.startX <= maze.endX && c.endX >= maze.endX)
    );

    for (let i = 0; i < count && candidates.length > 0; i++) {
      const corridor = candidates[Math.floor(Math.random() * candidates.length)];
      const y = corridor.y;
      const range = corridor.endX - corridor.startX - 1;
      const startGX = corridor.startX + 1;

      const key = `${y}-${startGX}`;
      if (usedPositions.has(key) || range < 2) continue;
      usedPositions.add(key);

      const minGridX = startGX;
      const maxGridX = corridor.endX - 1;
      const startX = minGridX + Math.random() * (maxGridX - minGridX);

      const size = maze.cellSize * 0.65;
      const offset = (maze.cellSize - size) / 2;
      const cornerRadius = size * 0.12;
      const baseSpd = this.baseSpeed * (0.75 + Math.random() * 0.6);

      this.obstacles.push({
        gridX: corridor.startX,
        gridY: y,
        x: maze.offsetX + startX * maze.cellSize + offset,
        y: maze.offsetY + y * maze.cellSize + offset,
        size,
        minX: maze.offsetX + minGridX * maze.cellSize + offset,
        maxX: maze.offsetX + maxGridX * maze.cellSize + offset,
        speed: baseSpd * this.globalSpeedMultiplier,
        baseSpeed: baseSpd,
        direction: Math.random() > 0.5 ? 1 : -1,
        pulsePhase: Math.random() * Math.PI * 2,
        cornerRadius
      });
    }
  }

  public update(dt: number, time: number): void {
    for (const obs of this.obstacles) {
      obs.x += obs.direction * obs.speed * dt;
      obs.pulsePhase = time * 3;

      if (obs.x <= obs.minX) {
        obs.x = obs.minX;
        obs.direction = 1;
      } else if (obs.x >= obs.maxX) {
        obs.x = obs.maxX;
        obs.direction = -1;
      }
    }
  }

  public checkCollision(px: number, py: number, radius: number): boolean {
    const effectiveRadius = radius * 0.92;

    for (const obs of this.obstacles) {
      const r = obs.cornerRadius;
      const left = obs.x + r;
      const right = obs.x + obs.size - r;
      const top = obs.y + r;
      const bottom = obs.y + obs.size - r;

      let closestX: number;
      let closestY: number;

      if (px < left) {
        closestX = left;
      } else if (px > right) {
        closestX = right;
      } else {
        closestX = px;
      }

      if (py < top) {
        closestY = top;
      } else if (py > bottom) {
        closestY = bottom;
      } else {
        closestY = py;
      }

      if (px >= left && px <= right && py >= top && py <= bottom) {
        return true;
      }

      let cornerCx = closestX;
      let cornerCy = closestY;

      if (closestX === left && closestY === top) {
        cornerCx = left;
        cornerCy = top;
      } else if (closestX === right && closestY === top) {
        cornerCx = right;
        cornerCy = top;
      } else if (closestX === left && closestY === bottom) {
        cornerCx = left;
        cornerCy = bottom;
      } else if (closestX === right && closestY === bottom) {
        cornerCx = right;
        cornerCy = bottom;
      }

      const dx = px - cornerCx;
      const dy = py - cornerCy;
      const effectiveCornerDist = effectiveRadius + r;

      if (dx * dx + dy * dy < effectiveCornerDist * effectiveCornerDist) {
        return true;
      }
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const obs of this.obstacles) {
      const pulse = 0.5 + 0.5 * Math.sin(obs.pulsePhase);
      const cx = obs.x + obs.size / 2;
      const cy = obs.y + obs.size / 2;
      const r = obs.cornerRadius;

      ctx.shadowColor = `rgba(255, 60, 60, ${0.5 + 0.3 * pulse})`;
      ctx.shadowBlur = 18 + 12 * pulse;

      const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.size, obs.y + obs.size);
      grad.addColorStop(0, '#ff4545');
      grad.addColorStop(0.5, '#e01515');
      grad.addColorStop(1, '#950000');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(obs.x + r, obs.y);
      ctx.lineTo(obs.x + obs.size - r, obs.y);
      ctx.quadraticCurveTo(obs.x + obs.size, obs.y, obs.x + obs.size, obs.y + r);
      ctx.lineTo(obs.x + obs.size, obs.y + obs.size - r);
      ctx.quadraticCurveTo(obs.x + obs.size, obs.y + obs.size, obs.x + obs.size - r, obs.y + obs.size);
      ctx.lineTo(obs.x + r, obs.y + obs.size);
      ctx.quadraticCurveTo(obs.x, obs.y + obs.size, obs.x, obs.y + obs.size - r);
      ctx.lineTo(obs.x, obs.y + r);
      ctx.quadraticCurveTo(obs.x, obs.y, obs.x + r, obs.y);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.fillStyle = `rgba(255, 150, 150, ${0.45 + 0.35 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - obs.size * 0.22);
      ctx.lineTo(cx + obs.size * 0.22, cy);
      ctx.lineTo(cx, cy + obs.size * 0.22);
      ctx.lineTo(cx - obs.size * 0.22, cy);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 200, 200, ${0.65 + 0.3 * pulse})`;
      ctx.lineWidth = 1.5 + 0.5 * pulse;
      ctx.beginPath();
      ctx.moveTo(obs.x + r, obs.y);
      ctx.lineTo(obs.x + obs.size - r, obs.y);
      ctx.quadraticCurveTo(obs.x + obs.size, obs.y, obs.x + obs.size, obs.y + r);
      ctx.lineTo(obs.x + obs.size, obs.y + obs.size - r);
      ctx.quadraticCurveTo(obs.x + obs.size, obs.y + obs.size, obs.x + obs.size - r, obs.y + obs.size);
      ctx.lineTo(obs.x + r, obs.y + obs.size);
      ctx.quadraticCurveTo(obs.x, obs.y + obs.size, obs.x, obs.y + obs.size - r);
      ctx.lineTo(obs.x, obs.y + r);
      ctx.quadraticCurveTo(obs.x, obs.y, obs.x + r, obs.y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}
