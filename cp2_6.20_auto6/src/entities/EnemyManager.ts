import Phaser from 'phaser';
import { WorldManager } from '../map/WorldManager';

export interface SlimeEnemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  gridX: number;
  gridY: number;
  moveTimer: number;
  jumpTimer: number;
  jumpPhase: number;
  hitFlashTimer: number;
  deathTimer: number;
  isDying: boolean;
  scale: number;
  targetDirX: number;
  targetDirY: number;
}

export enum EnemyEvent {
  SPAWNED = 'enemySpawned',
  DAMAGED = 'enemyDamaged',
  KILLED = 'enemyKilled',
  DROPPED_GOLD = 'enemyDroppedGold'
}

export class EnemyManager extends Phaser.Events.EventEmitter {
  private world: WorldManager;
  private enemies: Map<number, SlimeEnemy>;
  private nextEnemyId: number = 1;
  private spawnTimer: number = 0;
  private spawnInterval: number = 15000;
  private maxEnemies: number = 4;
  private baseSpeed: number = 40;

  constructor(world: WorldManager) {
    super();
    this.world = world;
    this.enemies = new Map();
  }

  public start(): void {
    for (let i = 0; i < 2; i++) {
      this.spawnEnemy();
    }
  }

  public update(deltaMs: number, playerX: number, playerY: number): void {
    this.spawnTimer += deltaMs;
    if (this.spawnTimer >= this.spawnInterval && this.enemies.size < this.maxEnemies) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (const enemy of this.enemies.values()) {
      if (enemy.isDying) {
        enemy.deathTimer -= deltaMs;
        enemy.scale = Math.max(0, 1 - (1 - enemy.deathTimer / 300));
        if (enemy.deathTimer <= 0) {
          this.onEnemyDeath(enemy);
        }
        continue;
      }

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= deltaMs;
      }

      enemy.jumpTimer += deltaMs;
      enemy.jumpPhase = (Math.sin(enemy.jumpTimer / 1000 * Math.PI * 2) + 1) / 2;

      enemy.moveTimer -= deltaMs;
      if (enemy.moveTimer <= 0) {
        enemy.moveTimer = 2000 + Math.random() * 2000;
        const dirs = [
          { x: 0, y: 0 },
          { x: 1, y: 0 }, { x: -1, y: 0 },
          { x: 0, y: 1 }, { x: 0, y: -1 }
        ];
        const distToPlayer = Math.sqrt(
          (playerX / WorldManager.TILE_SIZE - enemy.gridX) ** 2 +
          (playerY / WorldManager.TILE_SIZE - enemy.gridY) ** 2
        );
        let dir: { x: number; y: number };
        if (distToPlayer < 4 && Math.random() < 0.6) {
          const dx = Math.sign(playerX / WorldManager.TILE_SIZE - enemy.gridX);
          const dy = Math.sign(playerY / WorldManager.TILE_SIZE - enemy.gridY);
          if (Math.abs(dx) > Math.abs(dy)) {
            dir = { x: dx, y: 0 };
          } else {
            dir = { x: 0, y: dy };
          }
        } else {
          dir = dirs[Math.floor(Math.random() * dirs.length)];
        }
        enemy.targetDirX = dir.x;
        enemy.targetDirY = dir.y;
      }

      const dx = enemy.targetDirX;
      const dy = enemy.targetDirY;
      if (dx !== 0 || dy !== 0) {
        const dt = deltaMs / 1000;
        const newGX = enemy.gridX + dx * this.baseSpeed * dt / WorldManager.TILE_SIZE;
        const newGY = enemy.gridY + dy * this.baseSpeed * dt / WorldManager.TILE_SIZE;
        const iGX = Math.floor(newGX);
        const iGY = Math.floor(newGY);

        if (this.world.isWalkable(iGX, iGY)) {
          enemy.gridX = newGX;
          enemy.gridY = newGY;
          enemy.x = (enemy.gridX + 0.5) * WorldManager.TILE_SIZE;
          enemy.y = (enemy.gridY + 0.5) * WorldManager.TILE_SIZE;
        }
      }
    }
  }

  private spawnEnemy(): void {
    let attempts = 0;
    while (attempts < 100) {
      const gridX = Math.floor(Math.random() * WorldManager.GRID_SIZE);
      const gridY = Math.floor(Math.random() * WorldManager.GRID_SIZE);
      attempts++;

      const tile = this.world.getTile(gridX, gridY);
      if (!tile || !tile.walkable || tile.type === 'water') continue;

      const centerDist = Math.sqrt(
        (gridX - WorldManager.GRID_SIZE / 2) ** 2 +
        (gridY - WorldManager.GRID_SIZE / 2) ** 2
      );
      if (centerDist < 3) continue;

      const id = this.nextEnemyId++;
      const enemy: SlimeEnemy = {
        id,
        x: (gridX + 0.5) * WorldManager.TILE_SIZE,
        y: (gridY + 0.5) * WorldManager.TILE_SIZE,
        hp: 40,
        maxHp: 40,
        gridX,
        gridY,
        moveTimer: 1000,
        jumpTimer: Math.random() * 1000,
        jumpPhase: 0,
        hitFlashTimer: 0,
        deathTimer: 300,
        isDying: false,
        scale: 1,
        targetDirX: 0,
        targetDirY: 0
      };
      this.enemies.set(id, enemy);
      this.emit(EnemyEvent.SPAWNED, enemy);
      return;
    }
  }

  public damageEnemy(enemyId: number, damage: number): boolean {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || enemy.isDying) return false;

    enemy.hp -= damage;
    enemy.hitFlashTimer = 200;
    this.emit(EnemyEvent.DAMAGED, { enemy, damage });

    if (enemy.hp <= 0) {
      enemy.isDying = true;
      enemy.deathTimer = 300;
    }
    return true;
  }

  private onEnemyDeath(enemy: SlimeEnemy): void {
    const goldDrop = 1 + Math.floor(Math.random() * 3);
    this.emit(EnemyEvent.KILLED, enemy);
    this.emit(EnemyEvent.DROPPED_GOLD, {
      x: enemy.x,
      y: enemy.y,
      amount: goldDrop
    });
    this.enemies.delete(enemy.id);
  }

  public findEnemiesInRange(worldX: number, worldY: number, range: number): SlimeEnemy[] {
    const result: SlimeEnemy[] = [];
    for (const enemy of this.enemies.values()) {
      if (enemy.isDying) continue;
      const dist = Math.sqrt((enemy.x - worldX) ** 2 + (enemy.y - worldY) ** 2);
      if (dist <= range) {
        result.push(enemy);
      }
    }
    return result;
  }

  public getEnemies(): SlimeEnemy[] {
    return Array.from(this.enemies.values());
  }

  public getEnemyById(id: number): SlimeEnemy | undefined {
    return this.enemies.get(id);
  }
}
