import { Player } from './Player';

export interface Obstacle {
  x: number;
  y: number;
  size: number;
  active: boolean;
}

export class ObstacleGenerator {
  obstacles: Obstacle[] = [];
  spawnTimer = 0;
  spawnInterval = 2.0;
  private onCollisionCallback: (() => void) | null = null;

  onCollision(cb: () => void) {
    this.onCollisionCallback = cb;
  }

  update(dt: number, scrollSpeed: number, canvasWidth: number, canvasHeight: number, maxObjects: number) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && this.getTotalObjects() < maxObjects) {
      this.spawnTimer = 0;
      const size = 24 + Math.random() * 16;
      const y = Math.random() * (canvasHeight - size - 40) + 20;
      this.obstacles.push({
        x: canvasWidth + size,
        y,
        size,
        active: true
      });
    }

    for (const obs of this.obstacles) {
      obs.x -= scrollSpeed * dt;
    }

    this.obstacles = this.obstacles.filter(obs => obs.x + obs.size > -10);
  }

  checkCollision(player: Player): boolean {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      if (this.circleRectCollision(
        player.x, player.y, player.radius,
        obs.x, obs.y, obs.size, obs.size
      )) {
        return true;
      }
    }
    return false;
  }

  private circleRectCollision(
    cx: number, cy: number, cr: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  private getTotalObjects(): number {
    return this.obstacles.length;
  }

  setTotalObjects(count: number): number {
    return this.obstacles.length;
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
  }
}
