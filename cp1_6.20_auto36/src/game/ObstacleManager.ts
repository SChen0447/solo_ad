import type { GravityDirection } from '../utils/InputHandler';

export type PolygonShape = 'triangle' | 'pentagon' | 'hexagon';

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  size: number;
  shape: PolygonShape;
  color: string;
  rotation: number;
  rotationSpeed: number;
  fadeInProgress: number;
  vertices: { x: number; y: number }[];
}

export class ObstacleManager {
  public obstacles: Obstacle[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private nextId = 0;
  private spawnTimer = 0;
  private baseSpawnInterval = 1500;
  private hueOffset = 0;
  private readonly FADE_DURATION = 300;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  private generatePolygonVertices(shape: PolygonShape, size: number): { x: number; y: number }[] {
    const sides = shape === 'triangle' ? 3 : shape === 'pentagon' ? 5 : 6;
    const vertices: { x: number; y: number }[] = [];
    const angleOffset = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
      const angle = angleOffset + (i * 2 * Math.PI) / sides;
      vertices.push({
        x: Math.cos(angle) * size,
        y: Math.sin(angle) * size
      });
    }
    return vertices;
  }

  private getRandomShape(): PolygonShape {
    const shapes: PolygonShape[] = ['triangle', 'pentagon', 'hexagon'];
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  private getHSLColor(): string {
    const hue = this.hueOffset % 360;
    this.hueOffset += 47;
    return `hsl(${hue}, 80%, 60%)`;
  }

  public spawn(): void {
    const shape = this.getRandomShape();
    const size = 25 + Math.random() * 30;
    const x = this.canvasWidth + size + 50;
    const y = size + Math.random() * (this.canvasHeight - size * 2);

    this.obstacles.push({
      id: this.nextId++,
      x,
      y,
      size,
      shape,
      color: this.getHSLColor(),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.03,
      fadeInProgress: 0,
      vertices: this.generatePolygonVertices(shape, size)
    });
  }

  public update(deltaTime: number, scrollSpeed: number, difficultyMultiplier: number): void {
    const spawnInterval = this.baseSpawnInterval / difficultyMultiplier;
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawn();
    }

    this.obstacles = this.obstacles.filter(obs => {
      obs.x -= scrollSpeed;
      obs.rotation += obs.rotationSpeed;
      if (obs.fadeInProgress < this.FADE_DURATION) {
        obs.fadeInProgress += deltaTime;
      }
      return obs.x + obs.size > -50;
    });
  }

  public getObstacleAABB(obs: Obstacle): { minX: number; maxX: number; minY: number; maxY: number } {
    const cos = Math.cos(obs.rotation);
    const sin = Math.sin(obs.rotation);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const v of obs.vertices) {
      const rx = v.x * cos - v.y * sin;
      const ry = v.x * sin + v.y * cos;
      minX = Math.min(minX, rx);
      maxX = Math.max(maxX, rx);
      minY = Math.min(minY, ry);
      maxY = Math.max(maxY, ry);
    }

    return {
      minX: obs.x + minX,
      maxX: obs.x + maxX,
      minY: obs.y + minY,
      maxY: obs.y + maxY
    };
  }

  public getFadeAlpha(obs: Obstacle): number {
    return Math.min(1, obs.fadeInProgress / this.FADE_DURATION);
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public reset(): void {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.hueOffset = 0;
  }
}
