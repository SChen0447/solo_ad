import { WorldManager } from '../map/WorldManager';
import { InventoryManager, ItemType } from './InventoryManager';

export interface EnemyData {
  id: number;
  tileX: number;
  tileY: number;
  hp: number;
  maxHp: number;
  sprite: Phaser.GameObjects.Sprite | null;
  bounceTimer: number;
  patrolTimer: number;
  patrolDx: number;
  patrolDy: number;
  isDying: boolean;
  dyingTimer: number;
  hitFlash: boolean;
  hitFlashTimer: number;
}

export class EnemyManager {
  private worldManager: WorldManager;
  private inventoryManager: InventoryManager;
  private enemies: EnemyData[] = [];
  private nextId = 0;
  private spawnTimer = 0;
  private spawnInterval = 15000;
  private maxEnemies = 5;
  private deathCallbacks: ((enemy: EnemyData, drops: { x: number; y: number; type: ItemType }[]) => void)[] = [];

  constructor(worldManager: WorldManager, inventoryManager: InventoryManager) {
    this.worldManager = worldManager;
    this.inventoryManager = inventoryManager;
  }

  spawnEnemy(): EnemyData | null {
    if (this.enemies.length >= this.maxEnemies) return null;
    const mapW = this.worldManager.getMapWidth();
    const mapH = this.worldManager.getMapHeight();
    let attempts = 0;
    while (attempts < 50) {
      const x = Math.floor(Math.random() * mapW);
      const y = Math.floor(Math.random() * mapH);
      if (this.worldManager.isWalkable(x, y)) {
        const nearCraft = this.worldManager.getCraftingStationTile();
        if (Math.abs(x - nearCraft.x) < 3 && Math.abs(y - nearCraft.y) < 3) {
          attempts++;
          continue;
        }
        const enemy: EnemyData = {
          id: this.nextId++,
          tileX: x,
          tileY: y,
          hp: 20,
          maxHp: 20,
          sprite: null,
          bounceTimer: 0,
          patrolTimer: Math.random() * 3000,
          patrolDx: 0,
          patrolDy: 0,
          isDying: false,
          dyingTimer: 0,
          hitFlash: false,
          hitFlashTimer: 0,
        };
        this.enemies.push(enemy);
        return enemy;
      }
      attempts++;
    }
    return null;
  }

  update(delta: number): void {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (const enemy of this.enemies) {
      if (enemy.isDying) {
        enemy.dyingTimer -= delta;
        if (enemy.dyingTimer <= 0) {
          enemy.isDying = false;
        }
        continue;
      }
      enemy.bounceTimer += delta;
      enemy.patrolTimer -= delta;
      if (enemy.patrolTimer <= 0) {
        enemy.patrolTimer = 2000 + Math.random() * 2000;
        const dirs = [
          { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
          { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
        ];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        enemy.patrolDx = dir.dx;
        enemy.patrolDy = dir.dy;
        const nx = enemy.tileX + dir.dx;
        const ny = enemy.tileY + dir.dy;
        if (this.worldManager.isWalkable(nx, ny)) {
          enemy.tileX = nx;
          enemy.tileY = ny;
        }
      }
      if (enemy.hitFlash) {
        enemy.hitFlashTimer -= delta;
        if (enemy.hitFlashTimer <= 0) {
          enemy.hitFlash = false;
        }
      }
    }

    this.enemies = this.enemies.filter(e => !e.isDying || e.dyingTimer > 0);
  }

  getEnemyAt(x: number, y: number): EnemyData | null {
    for (const enemy of this.enemies) {
      if (enemy.tileX === x && enemy.tileY === y && !enemy.isDying) {
        return enemy;
      }
    }
    return null;
  }

  damageEnemy(enemy: EnemyData, damage: number): boolean {
    enemy.hp -= damage;
    enemy.hitFlash = true;
    enemy.hitFlashTimer = 200;
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
      return true;
    }
    return false;
  }

  private killEnemy(enemy: EnemyData): void {
    enemy.isDying = true;
    enemy.dyingTimer = 300;
    const goldCount = 1 + Math.floor(Math.random() * 3);
    const drops: { x: number; y: number; type: ItemType }[] = [];
    for (let i = 0; i < goldCount; i++) {
      const dx = Math.floor(Math.random() * 3) - 1;
      const dy = Math.floor(Math.random() * 3) - 1;
      drops.push({
        x: enemy.tileX + dx,
        y: enemy.tileY + dy,
        type: ItemType.GOLD,
      });
    }
    this.inventoryManager.addItem(ItemType.GOLD, goldCount);
    for (const cb of this.deathCallbacks) {
      cb(enemy, drops);
    }
  }

  getEnemies(): EnemyData[] {
    return this.enemies;
  }

  onEnemyDeath(callback: (enemy: EnemyData, drops: { x: number; y: number; type: ItemType }[]) => void): void {
    this.deathCallbacks.push(callback);
  }
}
