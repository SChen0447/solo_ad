import { EnemyType, ENEMY_CONFIGS, Point } from '../config';
import { Enemy } from '../units/Enemy';

export interface WaveEnemy {
  type: EnemyType;
  delay: number;
}

export class WaveManager {
  private path: Point[];
  currentWave: number;
  waveInProgress: boolean;
  spawnQueue: WaveEnemy[];
  spawnTimer: number;
  enemies: Enemy[];
  allSpawned: boolean;
  waveAnnouncement: string;
  announcementTimer: number;

  constructor(path: Point[]) {
    this.path = path;
    this.currentWave = 0;
    this.waveInProgress = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.enemies = [];
    this.allSpawned = false;
    this.waveAnnouncement = '';
    this.announcementTimer = 0;
  }

  generateWave(waveNum: number): void {
    this.currentWave = waveNum;
    this.waveInProgress = true;
    this.allSpawned = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.enemies = [];

    const totalEnemies = Math.min(15 + Math.floor(waveNum * 1.5), 30);
    const infantryCount = Math.floor(totalEnemies * 0.5);
    const cavalryCount = Math.floor(totalEnemies * 0.3);
    const siegeCount = Math.max(1, Math.floor(totalEnemies * 0.2));

    const waveEnemies: EnemyType[] = [];
    for (let i = 0; i < infantryCount; i++) waveEnemies.push('infantry');
    for (let i = 0; i < cavalryCount; i++) waveEnemies.push('cavalry');
    for (let i = 0; i < siegeCount; i++) waveEnemies.push('siege');

    for (let i = waveEnemies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [waveEnemies[i], waveEnemies[j]] = [waveEnemies[j], waveEnemies[i]];
    }

    let delay = 0;
    for (const type of waveEnemies) {
      this.spawnQueue.push({ type, delay });
      delay += 600 + Math.random() * 800;
    }

    this.waveAnnouncement = `第 ${waveNum} 波敌军来袭！步兵×${infantryCount} 骑兵×${cavalryCount} 攻城车×${siegeCount}`;
    this.announcementTimer = 4000;
  }

  update(dt: number): Enemy[] {
    if (!this.waveInProgress) return [];

    const newEnemies: Enemy[] = [];
    this.spawnTimer += dt;

    while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
      const toSpawn = this.spawnQueue.shift()!;
      const enemy = new Enemy(toSpawn.type, this.path);
      this.enemies.push(enemy);
      newEnemies.push(enemy);
    }

    if (this.spawnQueue.length === 0) {
      this.allSpawned = true;
    }

    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
    }

    return newEnemies;
  }

  isWaveComplete(): boolean {
    if (!this.waveInProgress) return false;
    return this.allSpawned && this.enemies.every(e => e.dead || e.reachedWall);
  }

  clearDeadEnemies(): void {
    this.enemies = this.enemies.filter(e => !e.dead && !e.reachedWall);
  }

  reset(): void {
    this.currentWave = 0;
    this.waveInProgress = false;
    this.spawnQueue = [];
    this.enemies = [];
    this.allSpawned = false;
  }
}
