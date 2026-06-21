import { GRID_SIZE, GRID_COLS, GRID_ROWS, CANVAS_HEIGHT } from './constants';

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Goal {
  x: number;
  y: number;
}

export interface LevelData {
  platforms: Platform[];
  goal: Goal | null;
}

export class LevelManager {
  private platforms: Platform[] = [];
  private goal: Goal | null = null;

  public addPlatform(gridX: number, gridY: number): void {
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return;
    }
    const exists = this.platforms.some(
      p => p.x === gridX * GRID_SIZE && p.y === gridY * GRID_SIZE
    );
    if (!exists) {
      this.platforms.push({
        x: gridX * GRID_SIZE,
        y: gridY * GRID_SIZE,
        width: GRID_SIZE,
        height: GRID_SIZE
      });
    }
  }

  public removePlatform(gridX: number, gridY: number): void {
    const targetX = gridX * GRID_SIZE;
    const targetY = gridY * GRID_SIZE;
    this.platforms = this.platforms.filter(
      p => !(p.x === targetX && p.y === targetY)
    );
  }

  public setGoal(gridX: number, gridY: number): void {
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return;
    }
    this.goal = {
      x: gridX * GRID_SIZE + GRID_SIZE / 2 - 3,
      y: gridY * GRID_SIZE
    };
  }

  public getPlatforms(): Platform[] {
    return this.platforms;
  }

  public getGoal(): Goal | null {
    return this.goal;
  }

  public clear(): void {
    this.platforms = [];
    this.goal = null;
  }

  public loadLevel(data: LevelData): void {
    this.platforms = [...data.platforms];
    this.goal = data.goal ? { ...data.goal } : null;
  }

  public exportLevel(): string {
    const data: LevelData = {
      platforms: this.platforms.map(p => ({ ...p })),
      goal: this.goal ? { ...this.goal } : null
    };
    return JSON.stringify(data, null, 2);
  }

  public getGridPlatforms(): Array<{ gridX: number; gridY: number }> {
    return this.platforms.map(p => ({
      gridX: p.x / GRID_SIZE,
      gridY: p.y / GRID_SIZE
    }));
  }

  public hasPlatformAt(gridX: number, gridY: number): boolean {
    return this.platforms.some(
      p => p.x === gridX * GRID_SIZE && p.y === gridY * GRID_SIZE
    );
  }

  public checkCollision(
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number
  ): Platform | null {
    for (const platform of this.platforms) {
      if (
        rectX < platform.x + platform.width &&
        rectX + rectWidth > platform.x &&
        rectY < platform.y + platform.height &&
        rectY + rectHeight > platform.y
      ) {
        return platform;
      }
    }
    return null;
  }

  public checkGoalReached(
    playerX: number,
    playerY: number,
    playerWidth: number,
    playerHeight: number
  ): boolean {
    if (!this.goal) return false;
    const goalWidth = 6;
    const goalHeight = GRID_SIZE;
    return (
      playerX < this.goal.x + goalWidth &&
      playerX + playerWidth > this.goal.x &&
      playerY < this.goal.y + goalHeight &&
      playerY + playerHeight > this.goal.y
    );
  }

  public isOutOfBounds(
    _x: number,
    y: number,
    _width: number,
    height: number
  ): boolean {
    return y > CANVAS_HEIGHT + height;
  }

  public getPresetLevel(): LevelData {
    const platforms: Platform[] = [
      { x: 0 * GRID_SIZE, y: 9 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 1 * GRID_SIZE, y: 9 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 2 * GRID_SIZE, y: 9 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 3 * GRID_SIZE, y: 7 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 4 * GRID_SIZE, y: 5 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 5 * GRID_SIZE, y: 5 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 6 * GRID_SIZE, y: 3 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 7 * GRID_SIZE, y: 3 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 8 * GRID_SIZE, y: 3 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE },
      { x: 9 * GRID_SIZE, y: 1 * GRID_SIZE, width: GRID_SIZE, height: GRID_SIZE }
    ];
    const goal: Goal = {
      x: 9 * GRID_SIZE + GRID_SIZE / 2 - 3,
      y: 0 * GRID_SIZE
    };
    return { platforms, goal };
  }
}
