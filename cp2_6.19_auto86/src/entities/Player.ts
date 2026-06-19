import { WorldManager } from '../map/WorldManager';
import { InventoryManager, ItemType } from './InventoryManager';
import { TerrainType } from '../map/Tile';

export class Player {
  tileX: number;
  tileY: number;
  hp: number;
  maxHp: number;
  exp: number;
  level: number;
  expToLevel: number;
  baseSpeed: number;
  currentTool: ItemType;
  sprite: Phaser.GameObjects.Sprite | null = null;
  toolIcon: Phaser.GameObjects.Image | null = null;
  isMoving: boolean = false;
  moveProgress: number = 0;
  moveFromX: number = 0;
  moveFromY: number = 0;
  direction: number = 0;
  animFrame: number = 0;
  animTimer: number = 0;
  isHarvesting: boolean = false;
  harvestTimer: number = 0;
  isAttacking: boolean = false;
  attackTimer: number = 0;

  private worldManager: WorldManager;
  private inventoryManager: InventoryManager;

  constructor(worldManager: WorldManager, inventoryManager: InventoryManager) {
    this.worldManager = worldManager;
    this.inventoryManager = inventoryManager;
    this.tileX = Math.floor(worldManager.getMapWidth() / 2);
    this.tileY = Math.floor(worldManager.getMapHeight() / 2);
    this.hp = 100;
    this.maxHp = 100;
    this.exp = 0;
    this.level = 1;
    this.expToLevel = 50;
    this.baseSpeed = 120;
    this.currentTool = ItemType.HAMMER;
  }

  tryMove(dx: number, dy: number): boolean {
    if (this.isMoving || this.isHarvesting || this.isAttacking) return false;
    const newX = this.tileX + dx;
    const newY = this.tileY + dy;
    if (!this.worldManager.isWalkable(newX, newY)) return false;
    this.moveFromX = this.tileX;
    this.moveFromY = this.tileY;
    this.tileX = newX;
    this.tileY = newY;
    this.isMoving = true;
    this.moveProgress = 0;
    if (dx === 0 && dy === -1) this.direction = 0;
    else if (dx === 1 && dy === -1) this.direction = 1;
    else if (dx === 1 && dy === 0) this.direction = 2;
    else if (dx === 1 && dy === 1) this.direction = 3;
    else if (dx === 0 && dy === 1) this.direction = 4;
    else if (dx === -1 && dy === 1) this.direction = 5;
    else if (dx === -1 && dy === 0) this.direction = 6;
    else if (dx === -1 && dy === -1) this.direction = 7;
    return true;
  }

  update(delta: number): void {
    if (this.isMoving) {
      const speedMult = this.worldManager.getMovementSpeed(this.tileX, this.tileY);
      this.moveProgress += (delta / 1000) * this.baseSpeed * speedMult / 32;
      this.animTimer += delta;
      if (this.animTimer > 150) {
        this.animFrame = (this.animFrame + 1) % 4;
        this.animTimer = 0;
      }
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.isMoving = false;
        this.moveFromX = this.tileX;
        this.moveFromY = this.tileY;
      }
    }
    if (this.isHarvesting) {
      this.harvestTimer -= delta;
      if (this.harvestTimer <= 0) {
        this.isHarvesting = false;
      }
    }
    if (this.isAttacking) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }
  }

  harvest(targetX: number, targetY: number): ItemType | null {
    if (this.currentTool !== ItemType.HAMMER) return null;
    const tile = this.worldManager.getTile(targetX, targetY);
    if (!tile || !tile.harvestable) return null;
    const dx = Math.abs(targetX - this.tileX);
    const dy = Math.abs(targetY - this.tileY);
    if (dx > 1 || dy > 1) return null;
    this.isHarvesting = true;
    this.harvestTimer = 500;
    let resourceType: ItemType;
    if (tile.type === TerrainType.TREE) {
      resourceType = ItemType.WOOD;
    } else if (tile.type === TerrainType.STONE) {
      const rand = Math.random();
      resourceType = rand < 0.7 ? ItemType.STONE : ItemType.IRON;
    } else {
      return null;
    }
    this.worldManager.setTile(targetX, targetY, { type: TerrainType.GRASS, textureIndex: 0, harvestable: false, walkable: true } as any);
    this.inventoryManager.addItem(resourceType, 1);
    this.addExp(5);
    return resourceType;
  }

  attack(): boolean {
    if (this.currentTool !== ItemType.SWORD && this.currentTool !== ItemType.IRON_SWORD) {
      return false;
    }
    this.isAttacking = true;
    this.attackTimer = 200;
    return true;
  }

  getAttackDamage(): number {
    let base = 10;
    if (this.currentTool === ItemType.IRON_SWORD) {
      base = Math.floor(base * 1.5);
    }
    return base;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  addExp(amount: number): void {
    this.exp += amount;
    while (this.exp >= this.expToLevel) {
      this.exp -= this.expToLevel;
      this.level++;
      this.expToLevel = Math.floor(this.expToLevel * 1.5);
      this.maxHp += 10;
      this.hp = Math.min(this.hp + 20, this.maxHp);
    }
  }

  setTool(tool: ItemType): void {
    this.currentTool = tool;
  }

  getPixelX(tileSize: number): number {
    if (!this.isMoving) return this.tileX * tileSize + tileSize / 2;
    const fromPx = this.moveFromX * tileSize + tileSize / 2;
    const toPx = this.tileX * tileSize + tileSize / 2;
    return fromPx + (toPx - fromPx) * this.moveProgress;
  }

  getPixelY(tileSize: number): number {
    if (!this.isMoving) return this.tileY * tileSize + tileSize / 2;
    const fromPx = this.moveFromY * tileSize + tileSize / 2;
    const toPx = this.tileY * tileSize + tileSize / 2;
    return fromPx + (toPx - fromPx) * this.moveProgress;
  }
}
