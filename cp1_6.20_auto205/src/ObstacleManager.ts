import type { MazeData } from './MazeEngine';

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  path: { x: number; y: number }[];
  pathIndex: number;
  direction: 1 | -1;
  moveProgress: number;
  speed: number;
  trail: { x: number; y: number; opacity: number }[];
}

export class ObstacleManager {
  private maze: MazeData;
  private level: number;
  obstacles: Obstacle[];
  private rng: { state: number; next: () => number; nextInt: (min: number, max: number) => number };

  constructor(maze: MazeData, level: number, seed?: number) {
    this.maze = maze;
    this.level = level;
    const s = (seed ?? Date.now()) >>> 0;
    const rngSelf: { state: number; next: () => number; nextInt: (min: number, max: number) => number } = {
      state: s || 1,
      next: function () {
        this.state = (this.state * 1664525 + 1013904223) >>> 0;
        return this.state / 0xffffffff;
      },
      nextInt: function (min: number, max: number) {
        return Math.floor(this.next() * (max - min + 1)) + min;
      },
    };
    this.rng = rngSelf;

    const count = Math.min(1 + level, 6);
    this.obstacles = this.generateObstacles(count);
  }

  private generateObstacles(count: number): Obstacle[] {
    const obstacles: Obstacle[] = [];
    const usedPaths = new Set<string>();
    const baseSpeed = 0.5;
    const speedBonus = Math.min(this.level * 0.05, 0.3);

    for (let i = 0; i < count; i++) {
      const path = this.findObstaclePath(usedPaths);
      if (path.length < 2) continue;

      const startIdx = this.rng.nextInt(0, path.length - 1);

      obstacles.push({
        id: i,
        x: path[startIdx].x,
        y: path[startIdx].y,
        path,
        pathIndex: startIdx,
        direction: this.rng.next() > 0.5 ? 1 : -1,
        moveProgress: 0,
        speed: baseSpeed - speedBonus,
        trail: [],
      });
    }

    return obstacles;
  }

  private findObstaclePath(usedPaths: Set<string>): { x: number; y: number }[] {
    const paths = this.maze.paths;
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const startPoint = paths[Math.floor(this.rng.next() * paths.length)];
      if (!startPoint) continue;
      if (
        (startPoint.x === this.maze.start.x && startPoint.y === this.maze.start.y) ||
        (startPoint.x === this.maze.exit.x && startPoint.y === this.maze.exit.y)
      )
        continue;

      const path = this.buildPathFromPoint(startPoint, usedPaths);
      if (path.length >= 2) return path;
    }

    const fallback = paths.filter(
      (p) =>
        !(p.x === this.maze.start.x && p.y === this.maze.start.y) &&
        !(p.x === this.maze.exit.x && p.y === this.maze.exit.y)
    );
    return fallback.slice(0, Math.min(3, fallback.length));
  }

  private buildPathFromPoint(
    start: { x: number; y: number },
    usedPaths: Set<string>
  ): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [start];
    const visited = new Set<string>([`${start.x},${start.y}`]);
    let current = start;

    const maxLen = this.rng.nextInt(2, 5);

    for (let i = 0; i < maxLen - 1; i++) {
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
      ].filter(
        (n) =>
          this.isValidPath(n.x, n.y) &&
          !visited.has(`${n.x},${n.y}`) &&
          !usedPaths.has(`${n.x},${n.y}`)
      );

      if (neighbors.length === 0) break;

      const next = neighbors[Math.floor(this.rng.next() * neighbors.length)];
      visited.add(`${next.x},${next.y}`);
      usedPaths.add(`${next.x},${next.y}`);
      path.push(next);
      current = next;
    }

    return path;
  }

  private isValidPath(x: number, y: number): boolean {
    if (y < 0 || y >= this.maze.rows || x < 0 || x >= this.maze.cols) return false;
    return this.maze.grid[y][x] === 'path';
  }

  update(deltaTime: number, cellSize: number): void {
    for (const obs of this.obstacles) {
      if (obs.path.length < 2) continue;

      obs.moveProgress += deltaTime / (obs.speed * 1000);

      if (obs.moveProgress >= 1) {
        obs.moveProgress = 0;

        const prevPos = { x: obs.x, y: obs.y };
        obs.trail.unshift({ x: prevPos.x, y: prevPos.y, opacity: 1 });
        if (obs.trail.length > 3) obs.trail.pop();
        obs.trail.forEach((t, idx) => {
          t.opacity = Math.max(0, 1 - (idx + 1) * 0.35);
        });

        obs.pathIndex += obs.direction;

        if (obs.pathIndex >= obs.path.length) {
          obs.pathIndex = obs.path.length - 2;
          obs.direction = -1;
        } else if (obs.pathIndex < 0) {
          obs.pathIndex = 1;
          obs.direction = 1;
        }

        obs.pathIndex = Math.max(0, Math.min(obs.path.length - 1, obs.pathIndex));

        const target = obs.path[obs.pathIndex];
        obs.x = target.x;
        obs.y = target.y;
      }
    }
  }

  getSmoothPosition(obs: Obstacle): { x: number; y: number } {
    if (obs.path.length < 2) return { x: obs.x, y: obs.y };

    const currentPos = obs.path[obs.pathIndex];
    let nextIdx = obs.pathIndex + obs.direction;
    nextIdx = Math.max(0, Math.min(obs.path.length - 1, nextIdx));
    const nextPos = obs.path[nextIdx];

    if (nextIdx === obs.pathIndex) return { x: obs.x, y: obs.y };

    return {
      x: currentPos.x + (nextPos.x - currentPos.x) * obs.moveProgress,
      y: currentPos.y + (nextPos.y - currentPos.y) * obs.moveProgress,
    };
  }

  checkCollision(px: number, py: number): boolean {
    for (const obs of this.obstacles) {
      const smooth = this.getSmoothPosition(obs);
      const dx = Math.abs(smooth.x - px);
      const dy = Math.abs(smooth.y - py);
      if (dx < 0.7 && dy < 0.7) return true;
    }
    return false;
  }

  reset(): void {
    const count = Math.min(1 + this.level, 6);
    this.obstacles = this.generateObstacles(count);
  }
}
