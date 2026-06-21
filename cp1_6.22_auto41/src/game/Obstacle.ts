export type ObstacleType = 'rock' | 'iron' | 'crystal';

export interface ObstacleConfig {
  type: ObstacleType;
  width: number;
  height: number;
  color: string;
}

export const OBSTACLE_CONFIGS: Record<ObstacleType, ObstacleConfig> = {
  rock: { type: 'rock', width: 20, height: 20, color: '#8B4513' },
  iron: { type: 'iron', width: 24, height: 24, color: '#808080' },
  crystal: { type: 'crystal', width: 18, height: 18, color: '#9932CC' }
};

export class Obstacle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public type: ObstacleType;
  public color: string;
  public speed: number;
  public active: boolean = true;

  constructor(canvasWidth: number, canvasHeight: number) {
    const types: ObstacleType[] = ['rock', 'iron', 'crystal'];
    const typeKey = types[Math.floor(Math.random() * types.length)];
    const config = OBSTACLE_CONFIGS[typeKey];

    this.type = typeKey;
    this.width = config.width;
    this.height = config.height;
    this.color = config.color;
    this.x = canvasWidth;
    this.y = Math.random() * (canvasHeight - this.height);
    this.speed = 120 + Math.random() * 80;
  }

  public update(dt: number): void {
    this.x -= this.speed * dt;
    if (this.x + this.width < 0) {
      this.active = false;
    }
  }

  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}

export function checkCollision(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
