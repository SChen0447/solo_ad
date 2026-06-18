import {
  Position,
  Enemy,
  EnemyType,
  WaveConfig,
  ENEMY_CONFIGS,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  MAX_WAVES,
} from './types';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export class EnemyAI {
  private canvasWidth: number;
  private canvasHeight: number;
  private paths: Position[][] = [];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generateMultiplePaths(5);
  }

  private generatePath(): Position[] {
    const waypointCount = Math.floor(Math.random() * 4) + 5;
    const path: Position[] = [];

    const startX = this.canvasWidth + 30;
    const endX = -30;

    path.push({ x: startX, y: this.canvasHeight / 2 });

    for (let i = 1; i < waypointCount - 1; i++) {
      const t = i / (waypointCount - 1);
      const x = startX - t * (startX - endX);
      const minY = CELL_SIZE * 1.5;
      const maxY = this.canvasHeight - CELL_SIZE * 1.5;
      const y = minY + Math.random() * (maxY - minY);
      path.push({ x, y });
    }

    path.push({ x: endX, y: this.canvasHeight / 2 });

    return this.smoothPath(path, 10);
  }

  private smoothPath(path: Position[], segmentsPerStep: number): Position[] {
    if (path.length < 2) return path;

    const smoothPath: Position[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = i > 0 ? path[i - 1] : path[i];
      const p1 = path[i];
      const p2 = path[i + 1];
      const p3 = i < path.length - 2 ? path[i + 2] : p2;

      for (let j = 0; j < segmentsPerStep; j++) {
        const t = j / segmentsPerStep;
        const t2 = t * t;
        const t3 = t2 * t;

        const x =
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

        const y =
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

        smoothPath.push({ x, y });
      }
    }

    smoothPath.push(path[path.length - 1]);
    return smoothPath;
  }

  public generateMultiplePaths(count: number): void {
    this.paths = [];
    for (let i = 0; i < count; i++) {
      this.paths.push(this.generatePath());
    }
  }

  public getRandomPath(): Position[] {
    if (this.paths.length === 0) {
      this.generateMultiplePaths(5);
    }
    const index = Math.floor(Math.random() * this.paths.length);
    return [...this.paths[index]];
  }

  public createEnemy(type: EnemyType, waveNumber: number): Enemy {
    const config = ENEMY_CONFIGS[type];
    const path = this.getRandomPath();

    const healthMultiplier = 1 + (waveNumber - 1) * 0.15;
    const speedMultiplier = 1 + (waveNumber - 1) * 0.05;

    const health = Math.floor(config.health * healthMultiplier);
    const speed = config.speed * speedMultiplier;

    return {
      id: generateId(),
      type,
      position: { ...path[0] },
      health,
      maxHealth: health,
      speed,
      pathIndex: 0,
      path,
      reward: Math.floor(config.reward * (1 + (waveNumber - 1) * 0.1)),
      damage: config.damage,
      hasShield: config.hasShield || false,
      shieldHealth: config.hasShield
        ? Math.floor((config.shieldHealth || 100) * healthMultiplier)
        : 0,
      maxShieldHealth: config.hasShield
        ? Math.floor((config.shieldHealth || 100) * healthMultiplier)
        : 0,
    };
  }

  public generateWaveConfig(waveNumber: number): WaveConfig {
    const baseEnemyCount = 10;
    const enemyCount = Math.min(40, baseEnemyCount + Math.floor((waveNumber - 1) * 1.5));

    const enemyTypes: EnemyType[] = ['scout'];

    if (waveNumber >= 3) {
      enemyTypes.push('heavy');
    }

    if (waveNumber >= 5) {
      enemyTypes.push('elite');
    }

    const spawnInterval = Math.max(500, 1500 - waveNumber * 50);

    return {
      waveNumber,
      enemyCount,
      enemyTypes,
      spawnInterval,
    };
  }

  public selectEnemyType(waveConfig: WaveConfig): EnemyType {
    const { waveNumber, enemyTypes } = waveConfig;

    const weights: Record<EnemyType, number> = {
      scout: Math.max(1, 10 - waveNumber * 0.5),
      heavy: waveNumber >= 3 ? Math.min(5, waveNumber * 0.3) : 0,
      elite: waveNumber >= 5 ? Math.min(3, waveNumber * 0.2) : 0,
    };

    const totalWeight = enemyTypes.reduce((sum, type) => sum + weights[type], 0);
    let random = Math.random() * totalWeight;

    for (const type of enemyTypes) {
      random -= weights[type];
      if (random <= 0) {
        return type;
      }
    }

    return 'scout';
  }

  public updateEnemy(enemy: Enemy, deltaTime: number): { reachedEnd: boolean } {
    if (enemy.pathIndex >= enemy.path.length - 1) {
      return { reachedEnd: true };
    }

    const target = enemy.path[enemy.pathIndex + 1];
    const dx = target.x - enemy.position.x;
    const dy = target.y - enemy.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < enemy.speed * 2) {
      enemy.pathIndex++;
      if (enemy.pathIndex >= enemy.path.length - 1) {
        return { reachedEnd: true };
      }
    } else {
      const moveX = (dx / distance) * enemy.speed * (deltaTime / 16);
      const moveY = (dy / distance) * enemy.speed * (deltaTime / 16);
      enemy.position.x += moveX;
      enemy.position.y += moveY;
    }

    return { reachedEnd: false };
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generateMultiplePaths(5);
  }
}
