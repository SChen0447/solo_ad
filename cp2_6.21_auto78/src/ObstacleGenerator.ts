import { Obstacle, GameState } from './types';

export class ObstacleGenerator {
  private obstacles: Obstacle[] = [];
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 2.0;
  private readonly MAX_OBSTACLES = 20;
  private canvasWidth: number;
  private canvasHeight: number;
  private onHitCallback: () => void = () => {};

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public setOnHitCallback(callback: () => void): void {
    this.onHitCallback = callback;
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public clear(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
  }

  public update(dt: number, scrollSpeed: number, playerState: GameState['player']): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= scrollSpeed * dt;
      if (o.x + o.width < 0) {
        this.obstacles.splice(i, 1);
        continue;
      }
      if (!o.passed && this.checkCollision(o, playerState)) {
        o.passed = true;
        this.onHitCallback();
      }
    }
  }

  private spawnObstacle(): void {
    if (this.obstacles.length >= this.MAX_OBSTACLES) return;
    const size = 24 + Math.random() * 16;
    const topMargin = 80;
    const bottomMargin = 60;
    const y = topMargin + Math.random() * (this.canvasHeight - topMargin - bottomMargin - size);
    this.obstacles.push({
      x: this.canvasWidth + 20,
      y,
      width: size,
      height: size,
      color: '#FF0055',
      passed: false
    });
  }

  private checkCollision(o: Obstacle, p: GameState['player']): boolean {
    const closestX = Math.max(o.x, Math.min(p.x, o.x + o.width));
    const closestY = Math.max(o.y, Math.min(p.y, o.y + o.height));
    const dx = p.x - closestX;
    const dy = p.y - closestY;
    return (dx * dx + dy * dy) < (p.radius * p.radius);
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
