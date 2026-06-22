export interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle {
  id: number;
  platformId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'box';
  passed: boolean;
}

export interface TerrainData {
  platforms: Platform[];
  obstacles: Obstacle[];
}

export class TerrainGenerator {
  private platformIdCounter: number = 0;
  private obstacleIdCounter: number = 0;
  private lastPlatformY: number = 380;
  private readonly minPlatformWidth: number = 120;
  private readonly maxPlatformWidth: number = 240;
  private readonly minHeightIncrease: number = 20;
  private readonly maxHeightIncrease: number = 60;
  private readonly platformHeight: number = 16;

  constructor() {}

  public reset(): void {
    this.platformIdCounter = 0;
    this.obstacleIdCounter = 0;
    this.lastPlatformY = 380;
  }

  public generateInitialTerrain(): TerrainData {
    this.reset();
    const platforms: Platform[] = [];
    const obstacles: Obstacle[] = [];

    const firstPlatform: Platform = {
      id: this.platformIdCounter++,
      x: 0,
      y: this.lastPlatformY,
      width: this.maxPlatformWidth,
      height: this.platformHeight,
    };
    platforms.push(firstPlatform);

    let currentX = firstPlatform.x + firstPlatform.width + this.getGapWidth();

    for (let i = 0; i < 8; i++) {
      const platform = this.createNextPlatform(currentX);
      platforms.push(platform);
      const obs = this.maybeCreateObstacle(platform);
      if (obs) obstacles.push(obs);
      currentX = platform.x + platform.width + this.getGapWidth();
    }

    return { platforms, obstacles };
  }

  public generateNextPlatform(currentRightEdge: number): { platform: Platform; obstacle: Obstacle | null } {
    const platform = this.createNextPlatform(currentRightEdge);
    const obstacle = this.maybeCreateObstacle(platform);
    return { platform, obstacle };
  }

  private createNextPlatform(startX: number): Platform {
    const width = this.randomRange(this.minPlatformWidth, this.maxPlatformWidth);
    const heightIncrease = this.randomRange(this.minHeightIncrease, this.maxHeightIncrease);

    let newY = this.lastPlatformY - heightIncrease;
    const minY = 180;
    if (newY < minY) {
      newY = 380;
    }
    this.lastPlatformY = newY;

    return {
      id: this.platformIdCounter++,
      x: startX,
      y: newY,
      width,
      height: this.platformHeight,
    };
  }

  private maybeCreateObstacle(platform: Platform): Obstacle | null {
    if (platform.width < 150) return null;
    if (Math.random() < 0.5) return null;

    const type: 'spike' | 'box' = Math.random() < 0.5 ? 'spike' : 'box';
    const obstacleWidth = 30;
    const obstacleHeight = 30;
    const minX = platform.x + 40;
    const maxX = platform.x + platform.width - obstacleWidth - 40;

    if (maxX <= minX) return null;

    const x = this.randomRange(minX, maxX);
    const y = platform.y - obstacleHeight;

    return {
      id: this.obstacleIdCounter++,
      platformId: platform.id,
      x,
      y,
      width: obstacleWidth,
      height: obstacleHeight,
      type,
      passed: false,
    };
  }

  private getGapWidth(): number {
    return this.randomRange(60, 100);
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
