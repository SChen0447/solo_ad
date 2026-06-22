import {
  Enemy, ENEMY_CONFIGS, WAVE_ENEMIES, ENEMY_SPAWN_INTERVAL,
  GRID_ROWS, genId,
} from './types';

interface WaveSpawnState {
  normal: number;
  shield: number;
  fast: number;
  spawned: number;
  lastSpawnTime: number;
}

export class EnemyWaveManager {
  private spawnState: WaveSpawnState = { normal: 0, shield: 0, fast: 0, spawned: 0, lastSpawnTime: 0 };
  private spawnQueue: Array<'normal' | 'shield' | 'fast'> = [];
  private waveSpeedMultiplier = 1;

  initWave(wave: number, currentTime: number): void {
    const waveIndex = Math.min(wave - 1, WAVE_ENEMIES.length - 1);
    const config = WAVE_ENEMIES[waveIndex];
    this.spawnState = {
      normal: config.normal,
      shield: config.shield,
      fast: config.fast,
      spawned: 0,
      lastSpawnTime: currentTime,
    };
    this.waveSpeedMultiplier = 1 + (wave - 1) * 0.1;
    this.spawnQueue = [];
    for (let i = 0; i < config.normal; i++) this.spawnQueue.push('normal');
    for (let i = 0; i < config.shield; i++) this.spawnQueue.push('shield');
    for (let i = 0; i < config.fast; i++) this.spawnQueue.push('fast');
    this.shuffleQueue();
  }

  private shuffleQueue(): void {
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
  }

  getTotalEnemies(): number {
    return this.spawnState.normal + this.spawnState.shield + this.spawnState.fast;
  }

  getSpawnedCount(): number {
    return this.spawnState.spawned;
  }

  isWaveComplete(): boolean {
    return this.spawnState.spawned >= this.getTotalEnemies();
  }

  trySpawn(currentTime: number, cellSize: number): Enemy | null {
    if (this.isWaveComplete()) return null;
    if (currentTime - this.spawnState.lastSpawnTime < ENEMY_SPAWN_INTERVAL) return null;

    const variant = this.spawnQueue[this.spawnState.spawned];
    if (!variant) return null;

    const config = ENEMY_CONFIGS[variant];
    const canvasWidth = 20 * cellSize;
    const y = Math.floor(Math.random() * GRID_ROWS) * cellSize + cellSize / 2;

    const enemy: Enemy = {
      id: genId(),
      x: canvasWidth + cellSize,
      y,
      variant,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed * this.waveSpeedMultiplier,
      shieldActive: variant === 'shield',
      lastShieldTime: variant === 'shield' ? currentTime : 0,
      hitFlashTime: 0,
      dead: false,
      deathTime: 0,
      opacity: 1,
    };

    this.spawnState.spawned++;
    this.spawnState.lastSpawnTime = currentTime;
    return enemy;
  }
}
