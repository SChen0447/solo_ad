import { EntityManager, type Enemy, type EnemyType } from './EntityManager';

export interface PathPoint {
  x: number;
  y: number;
}

export interface WaveConfig {
  waveNumber: number;
  enemies: { type: EnemyType; count: number }[];
  spawnInterval: number;
}

export class AISystem {
  private entityManager: EntityManager;
  private path: PathPoint[] = [];
  private currentWave: number = 0;
  private waveInProgress: boolean = false;
  private enemiesToSpawn: { type: EnemyType; count: number }[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 1000;
  private totalEnemiesInWave: number = 0;
  private spawnedEnemies: number = 0;
  private gridCellSize: number = 40;
  private gridWidth: number = 0;
  private gridHeight: number = 0;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  setGridDimensions(width: number, height: number, cellSize: number): void {
    this.gridWidth = width;
    this.gridHeight = height;
    this.gridCellSize = cellSize;
    this.generatePath();
  }

  private generatePath(): void {
    const points: PathPoint[] = [];
    const cellSize = this.gridCellSize;
    const rows = Math.floor(this.gridHeight / cellSize);

    const startY = Math.floor(rows / 2);
    points.push({ x: 0, y: startY * cellSize + cellSize / 2 });

    const midX1 = Math.floor(this.gridWidth * 0.25);
    points.push({ x: midX1 * cellSize, y: startY * cellSize + cellSize / 2 });

    const topY = Math.floor(rows * 0.2);
    points.push({ x: midX1 * cellSize, y: topY * cellSize + cellSize / 2 });

    const midX2 = Math.floor(this.gridWidth * 0.55);
    points.push({ x: midX2 * cellSize, y: topY * cellSize + cellSize / 2 });

    const bottomY = Math.floor(rows * 0.8);
    points.push({ x: midX2 * cellSize, y: bottomY * cellSize + cellSize / 2 });

    const midX3 = Math.floor(this.gridWidth * 0.8);
    points.push({ x: midX3 * cellSize, y: bottomY * cellSize + cellSize / 2 });

    const midY2 = Math.floor(rows * 0.5);
    points.push({ x: midX3 * cellSize, y: midY2 * cellSize + cellSize / 2 });

    points.push({ x: this.gridWidth + cellSize, y: midY2 * cellSize + cellSize / 2 });

    this.path = points;
  }

  getPath(): PathPoint[] {
    return this.path;
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  isWaveInProgress(): boolean {
    return this.waveInProgress;
  }

  startNextWave(): boolean {
    if (this.waveInProgress) {
      return false;
    }

    this.currentWave++;
    this.waveInProgress = true;
    this.spawnedEnemies = 0;
    this.spawnTimer = 0;

    const waveConfig = this.generateWaveConfig(this.currentWave);
    this.enemiesToSpawn = waveConfig.enemies;
    this.spawnInterval = waveConfig.spawnInterval;
    this.totalEnemiesInWave = waveConfig.enemies.reduce((sum, e) => sum + e.count, 0);

    return true;
  }

  private generateWaveConfig(wave: number): WaveConfig {
    const enemies: { type: EnemyType; count: number }[] = [];
    const baseCount = 3 + Math.floor(wave * 1.5);

    const normalCount = Math.max(2, baseCount - Math.floor(wave * 0.3));
    enemies.push({ type: 'normal', count: normalCount });

    if (wave >= 2) {
      const fastCount = Math.floor(wave * 0.5) + 1;
      enemies.push({ type: 'fast', count: fastCount });
    }

    if (wave >= 4) {
      const heavyCount = Math.floor((wave - 3) * 0.5) + 1;
      enemies.push({ type: 'heavy', count: heavyCount });
    }

    const spawnInterval = Math.max(400, 1200 - wave * 50);

    return {
      waveNumber: wave,
      enemies,
      spawnInterval
    };
  }

  update(deltaTime: number, _currentTime: number): void {
    if (!this.waveInProgress) return;

    this.spawnTimer += deltaTime * 1000;

    if (this.spawnTimer >= this.spawnInterval && this.enemiesToSpawn.length > 0) {
      this.spawnTimer = 0;
      this.spawnNextEnemy();
    }

    this.updateEnemies(deltaTime);

    if (
      this.spawnedEnemies >= this.totalEnemiesInWave &&
      this.entityManager.enemies.size === 0
    ) {
      this.waveInProgress = false;
    }
  }

  private spawnNextEnemy(): void {
    if (this.enemiesToSpawn.length === 0) return;

    const currentGroup = this.enemiesToSpawn[0];
    if (!currentGroup) return;

    if (currentGroup.count > 0) {
      const startPoint = this.path[0];
      if (startPoint) {
        const enemy = this.entityManager.createEnemy(
          currentGroup.type,
          startPoint.x - this.gridCellSize,
          startPoint.y
        );
        enemy.pathIndex = 0;
      }
      currentGroup.count--;
      this.spawnedEnemies++;
    }

    if (currentGroup.count <= 0) {
      this.enemiesToSpawn.shift();
    }
  }

  private updateEnemies(deltaTime: number): void {
    const enemiesToRemove: string[] = [];

    for (const enemy of this.entityManager.enemies.values()) {
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= deltaTime * 1000;
        if (enemy.slowTimer <= 0) {
          enemy.slowFactor = 1;
          enemy.speed = enemy.baseSpeed;
        }
      }

      const targetPoint = this.path[enemy.pathIndex];
      if (!targetPoint) {
        enemiesToRemove.push(enemy.id);
        continue;
      }

      const dx = targetPoint.x - enemy.x;
      const dy = targetPoint.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2) {
        enemy.pathIndex++;
        if (enemy.pathIndex >= this.path.length) {
          enemiesToRemove.push(enemy.id);
        }
      } else {
        const speed = enemy.speed * enemy.slowFactor * deltaTime;
        const moveX = (dx / distance) * speed;
        const moveY = (dy / distance) * speed;
        enemy.x += moveX;
        enemy.y += moveY;
      }
    }

    for (const id of enemiesToRemove) {
      this.entityManager.removeEnemy(id);
    }
  }

  isEnemyAtEnd(enemy: Enemy): boolean {
    return enemy.pathIndex >= this.path.length;
  }

  reset(): void {
    this.currentWave = 0;
    this.waveInProgress = false;
    this.enemiesToSpawn = [];
    this.spawnTimer = 0;
    this.totalEnemiesInWave = 0;
    this.spawnedEnemies = 0;
  }

  getRemainingEnemiesInWave(): number {
    const queued = this.enemiesToSpawn.reduce((sum, e) => sum + e.count, 0);
    return queued + this.entityManager.enemies.size;
  }
}
