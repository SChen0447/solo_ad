import Phaser from 'phaser';
import {
  WAVES,
  Wave,
  PATH_POINTS,
  ENEMY_CONFIGS,
  EnemyType,
  gridToPixel,
  EnemyConfig
} from '../data/LevelData';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  config: EnemyConfig;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Graphics;
  hpBarBg: Phaser.GameObjects.Graphics;
  hpBar: Phaser.GameObjects.Graphics;
  currentPathIndex: number;
  targetPointIndex: number;
  isAlive: boolean;
  reachedEnd: boolean;
}

export interface EnemySpawnEvent {
  enemy: Enemy;
}

export class WaveManager {
  private scene: Phaser.Scene;
  private nextEnemyId: number = 0;
  private currentWaveIndex: number = -1;
  private isWaveActive: boolean = false;
  private pendingSpawns: { type: EnemyType; time: number }[] = [];
  private waveStartTime: number = 0;
  private enemiesSpawnedInWave: number = 0;
  private totalEnemiesInWave: number = 0;
  private waveCompletedListeners: (() => void)[] = [];
  private allWavesCompletedListeners: (() => void)[] = [];
  private enemySpawnListeners: ((event: EnemySpawnEvent) => void)[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get totalWaves(): number {
    return WAVES.length;
  }

  get currentWave(): number {
    return this.currentWaveIndex + 1;
  }

  get isCurrentWaveActive(): boolean {
    return this.isWaveActive;
  }

  onEnemySpawn(listener: (event: EnemySpawnEvent) => void): void {
    this.enemySpawnListeners.push(listener);
  }

  onWaveCompleted(listener: () => void): void {
    this.waveCompletedListeners.push(listener);
  }

  onAllWavesCompleted(listener: () => void): void {
    this.allWavesCompletedListeners.push(listener);
  }

  startNextWave(): boolean {
    if (this.currentWaveIndex >= WAVES.length - 1) {
      return false;
    }

    this.currentWaveIndex++;
    this.isWaveActive = true;
    this.pendingSpawns = [];
    this.waveStartTime = this.scene.time.now;
    this.enemiesSpawnedInWave = 0;

    const wave = WAVES[this.currentWaveIndex];
    this.scheduleWaveEnemies(wave);
    this.totalEnemiesInWave = this.pendingSpawns.length;

    return true;
  }

  private scheduleWaveEnemies(wave: Wave): void {
    let currentTime = wave.delay;

    for (const enemyGroup of wave.enemies) {
      for (let i = 0; i < enemyGroup.count; i++) {
        this.pendingSpawns.push({
          type: enemyGroup.type,
          time: currentTime
        });
        currentTime += enemyGroup.interval;
      }
    }
  }

  update(currentTime: number): void {
    if (!this.isWaveActive) {
      return;
    }

    const elapsed = currentTime - this.waveStartTime;

    while (
      this.pendingSpawns.length > 0 &&
      this.pendingSpawns[0].time <= elapsed
    ) {
      const spawn = this.pendingSpawns.shift()!;
      const enemy = this.spawnEnemy(spawn.type);
      this.enemiesSpawnedInWave++;

      for (const listener of this.enemySpawnListeners) {
        listener({ enemy });
      }
    }
  }

  notifyEnemyKilled(enemiesRemaining: number): void {
    if (
      this.isWaveActive &&
      this.pendingSpawns.length === 0 &&
      enemiesRemaining === 0
    ) {
      this.isWaveActive = false;

      for (const listener of this.waveCompletedListeners) {
        listener();
      }

      if (this.currentWaveIndex >= WAVES.length - 1) {
        for (const listener of this.allWavesCompletedListeners) {
          listener();
        }
      }
    }
  }

  private spawnEnemy(type: EnemyType): Enemy {
    const config = ENEMY_CONFIGS[type];
    const startPoint = gridToPixel(PATH_POINTS[0].x, PATH_POINTS[0].y);
    const container = this.scene.add.container(startPoint.x, startPoint.y);

    const sprite = this.scene.add.graphics();
    this.drawEnemySprite(sprite, config.color, config.size, type);
    container.add(sprite);

    const hpBarBg = this.scene.add.graphics();
    hpBarBg.fillStyle(0x000000, 0.7);
    hpBarBg.fillRoundedRect(-20, -config.size - 14, 40, 6, 2);
    container.add(hpBarBg);

    const hpBar = this.scene.add.graphics();
    this.drawHpBar(hpBar, 1);
    container.add(hpBar);

    container.setDepth(10);

    this.scene.tweens.add({
      targets: container,
      scale: { from: 0, to: 1 },
      duration: 200,
      ease: 'Back.easeOut'
    });

    return {
      id: this.nextEnemyId++,
      type,
      x: startPoint.x,
      y: startPoint.y,
      hp: config.hp,
      maxHp: config.hp,
      speed: config.speed,
      reward: config.reward,
      config,
      container,
      sprite,
      hpBarBg,
      hpBar,
      currentPathIndex: 0,
      targetPointIndex: 1,
      isAlive: true,
      reachedEnd: false
    };
  }

  private drawEnemySprite(
    graphics: Phaser.GameObjects.Graphics,
    color: number,
    size: number,
    type: EnemyType
  ): void {
    graphics.clear();
    graphics.fillStyle(color, 1);

    switch (type) {
      case 'normal':
        graphics.fillCircle(0, 0, size);
        graphics.fillStyle(0x2E7D32, 1);
        graphics.fillCircle(-size * 0.4, -size * 0.3, size * 0.25);
        graphics.fillCircle(size * 0.4, -size * 0.3, size * 0.25);
        break;
      case 'fast':
        graphics.fillTriangle(-size, size * 0.7, size, size * 0.7, 0, -size);
        graphics.fillStyle(0x0277BD, 1);
        graphics.fillCircle(-size * 0.3, 0, size * 0.2);
        graphics.fillCircle(size * 0.3, 0, size * 0.2);
        break;
      case 'heavy':
        graphics.fillRoundedRect(-size, -size, size * 2, size * 2, 4);
        graphics.fillStyle(0x455A64, 1);
        graphics.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 0.35);
        graphics.fillStyle(0x90A4AE, 1);
        graphics.fillRect(-size * 0.4, -size * 0.55, size * 0.8, size * 0.1);
        break;
    }

    graphics.lineStyle(2, 0xFFFFFF, 0.4);
    switch (type) {
      case 'normal':
        graphics.strokeCircle(0, 0, size);
        break;
      case 'fast':
        graphics.strokeTriangle(-size, size * 0.7, size, size * 0.7, 0, -size);
        break;
      case 'heavy':
        graphics.strokeRoundedRect(-size, -size, size * 2, size * 2, 4);
        break;
    }
  }

  private drawHpBar(graphics: Phaser.GameObjects.Graphics, ratio: number): void {
    graphics.clear();
    const width = 36 * ratio;
    const xOffset = -18;
    const color = ratio > 0.5 ? 0x4CAF50 : ratio > 0.25 ? 0xFFC107 : 0xF44336;
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(xOffset, -23, Math.max(0, width), 4, 1);
  }

  updateEnemyHpBar(enemy: Enemy): void {
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.drawHpBar(enemy.hpBar, ratio);
  }

  moveEnemy(enemy: Enemy, delta: number): void {
    if (!enemy.isAlive || enemy.reachedEnd) {
      return;
    }

    if (enemy.targetPointIndex >= PATH_POINTS.length) {
      enemy.reachedEnd = true;
      return;
    }

    const target = gridToPixel(
      PATH_POINTS[enemy.targetPointIndex].x,
      PATH_POINTS[enemy.targetPointIndex].y
    );
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.currentPathIndex = enemy.targetPointIndex;
      enemy.targetPointIndex++;
    } else {
      const moveDistance = enemy.speed * (delta / 1000);
      const ratio = Math.min(moveDistance / distance, 1);
      enemy.x += dx * ratio;
      enemy.y += dy * ratio;
    }

    enemy.container.setPosition(enemy.x, enemy.y);
  }

  destroyEnemy(enemy: Enemy, withEffect: boolean = false): void {
    if (!withEffect) {
      enemy.container.destroy();
      return;
    }

    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.circle(
        enemy.x,
        enemy.y,
        Phaser.Math.Between(3, 7),
        enemy.config.color,
        0.9
      );
      particle.setDepth(30);

      const angle = (Math.PI * 2 * i) / 10;
      const dist = Phaser.Math.Between(25, 55);
      const tx = enemy.x + Math.cos(angle) * dist;
      const ty = enemy.y + Math.sin(angle) * dist;

      this.scene.tweens.add({
        targets: particle,
        x: tx,
        y: ty,
        alpha: 0,
        scale: 0.2,
        duration: 450,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    this.scene.tweens.add({
      targets: enemy.container,
      scale: 1.6,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => enemy.container.destroy()
    });
  }
}
