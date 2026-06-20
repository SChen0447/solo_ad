import type { GravityDirection } from '../utils/InputHandler';

export interface EnergyBall {
  id: number;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  pulsePhase: number;
}

export class EnergyManager {
  public energyBalls: EnergyBall[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private nextId = 0;
  private spawnTimer = 0;
  private readonly SPAWN_INTERVAL = 5000;
  private readonly BATCH_SIZE = 5;
  private readonly BALL_RADIUS = 10;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  private getGroundY(gravityDirection: GravityDirection, offset: number): number {
    const margin = 50 + offset * 80;
    switch (gravityDirection) {
      case 'down':
        return this.canvasHeight - margin;
      case 'up':
        return margin;
      case 'left':
        return margin + Math.random() * (this.canvasHeight - margin * 2);
      case 'right':
        return margin + Math.random() * (this.canvasHeight - margin * 2);
      default:
        return this.canvasHeight - margin;
    }
  }

  public spawnBatch(gravityDirection: GravityDirection): void {
    const startX = this.canvasWidth + 100;
    for (let i = 0; i < this.BATCH_SIZE; i++) {
      const x = startX + i * 60;
      const y = this.getGroundY(gravityDirection, i);
      this.energyBalls.push({
        id: this.nextId++,
        x,
        y,
        radius: this.BALL_RADIUS,
        collected: false,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  public update(deltaTime: number, scrollSpeed: number, gravityDirection: GravityDirection): void {
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnBatch(gravityDirection);
    }

    this.energyBalls = this.energyBalls.filter(ball => {
      if (ball.collected) return false;
      ball.x -= scrollSpeed;
      ball.pulsePhase += deltaTime * 0.005;
      return ball.x + ball.radius > -50;
    });
  }

  public checkCollision(playerAABB: { minX: number; maxX: number; minY: number; maxY: number }): number {
    let collected = 0;
    for (const ball of this.energyBalls) {
      if (ball.collected) continue;
      const ballAABB = {
        minX: ball.x - ball.radius,
        maxX: ball.x + ball.radius,
        minY: ball.y - ball.radius,
        maxY: ball.y + ball.radius
      };
      if (
        playerAABB.minX < ballAABB.maxX &&
        playerAABB.maxX > ballAABB.minX &&
        playerAABB.minY < ballAABB.maxY &&
        playerAABB.maxY > ballAABB.minY
      ) {
        ball.collected = true;
        collected++;
      }
    }
    return collected;
  }

  public getPulseScale(ball: EnergyBall): number {
    return 1 + Math.sin(ball.pulsePhase) * 0.15;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public reset(): void {
    this.energyBalls = [];
    this.spawnTimer = 0;
  }
}
