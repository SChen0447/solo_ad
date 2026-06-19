import Phaser from 'phaser';
import { WorldManager } from '../map/WorldManager';
import { InventoryManager, ToolType, TOOL_SLOTS } from './InventoryManager';

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  exp: number;
  expToNextLevel: number;
  direction: number;
  isMoving: boolean;
  currentTool: ToolType | null;
}

export enum PlayerEvent {
  STATE_CHANGED = 'playerStateChanged',
  HP_CHANGED = 'playerHpChanged',
  EXP_CHANGED = 'playerExpChanged',
  LEVEL_UP = 'playerLevelUp',
  TOOL_CHANGED = 'playerToolChanged',
  HARVEST = 'playerHarvest',
  ATTACK = 'playerAttack'
}

export class Player extends Phaser.Events.EventEmitter {
  private world: WorldManager;
  private inventory: InventoryManager;

  private _x: number;
  private _y: number;
  private _hp: number;
  private _maxHp: number = 100;
  private _level: number = 1;
  private _exp: number = 0;
  private _expToNextLevel: number = 100;
  private _direction: number = 0;
  private _isMoving: boolean = false;
  private _currentTool: ToolType | null = ToolType.HAMMER;
  private _currentToolSlot: number = 0;
  private _baseSpeed: number = 140;

  private animFrame: number = 0;
  private animTimer: number = 0;
  private animFrameDuration: number = 120;

  private toolSlots: (ToolType | null)[] = [...TOOL_SLOTS];

  constructor(world: WorldManager, inventory: InventoryManager) {
    super();
    this.world = world;
    this.inventory = inventory;

    this._x = WorldManager.GRID_SIZE * WorldManager.TILE_SIZE / 2;
    this._y = WorldManager.GRID_SIZE * WorldManager.TILE_SIZE / 2;
    this._hp = this._maxHp;

    this.inventory.on('inventoryChanged', () => {
      this.syncToolSlotsWithInventory();
    });
  }

  public update(deltaMs: number, input: { up: boolean; down: boolean; left: boolean; right: boolean }, performanceMode: boolean = false): void {
    let dx = 0;
    let dy = 0;

    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    const moving = dx !== 0 || dy !== 0;
    this._isMoving = moving;

    if (moving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      if (Math.abs(dx) > Math.abs(dy)) {
        this._direction = dx > 0 ? 3 : 1;
      } else {
        this._direction = dy > 0 ? 0 : 2;
      }

      let speed = this._baseSpeed;
      const gridX = Math.floor(this._x / WorldManager.TILE_SIZE);
      const gridY = Math.floor(this._y / WorldManager.TILE_SIZE);
      if (this.world.isSlow(gridX, gridY)) {
        speed *= 0.5;
      }

      const dt = deltaMs / 1000;
      const newX = this._x + dx * speed * dt;
      const newY = this._y + dy * speed * dt;

      const playerRadius = WorldManager.TILE_SIZE * 0.3;

      if (this.canMoveTo(newX, this._y, playerRadius)) {
        this._x = newX;
      }
      if (this.canMoveTo(this._x, newY, playerRadius)) {
        this._y = newY;
      }

      if (!performanceMode) {
        this.animTimer += deltaMs;
        if (this.animTimer >= this.animFrameDuration) {
          this.animTimer = 0;
          this.animFrame = (this.animFrame + 1) % 4;
        }
      } else {
        this.animFrame = 0;
      }
    } else {
      this.animFrame = 0;
      this.animTimer = 0;
    }

    this.emit(PlayerEvent.STATE_CHANGED, this.getState());
  }

  private canMoveTo(x: number, y: number, radius: number): boolean {
    const minGX = Math.floor((x - radius) / WorldManager.TILE_SIZE);
    const maxGX = Math.floor((x + radius) / WorldManager.TILE_SIZE);
    const minGY = Math.floor((y - radius) / WorldManager.TILE_SIZE);
    const maxGY = Math.floor((y + radius) / WorldManager.TILE_SIZE);

    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        if (!this.world.isWalkable(gx, gy)) {
          return false;
        }
      }
    }
    return true;
  }

  public harvestAt(worldX: number, worldY: number): { item: string | null; gridX: number; gridY: number } {
    const gridX = Math.floor(worldX / WorldManager.TILE_SIZE);
    const gridY = Math.floor(worldY / WorldManager.TILE_SIZE);

    const px = this._x / WorldManager.TILE_SIZE;
    const py = this._y / WorldManager.TILE_SIZE;
    const dist = Math.sqrt((gridX + 0.5 - px) ** 2 + (gridY + 0.5 - py) ** 2);

    if (dist > 2) {
      return { item: null, gridX, gridY };
    }

    const item = this.world.harvestTile(gridX, gridY);
    if (item) {
      this.inventory.addItem(item, 1);
      this.addExp(10);
      this.emit(PlayerEvent.HARVEST, { gridX, gridY, item });
    }
    return { item, gridX, gridY };
  }

  public getAttackDamage(): number {
    if (this._currentTool === ToolType.IRON_SWORD) return 30;
    if (this._currentTool === ToolType.SWORD) return 20;
    return 5;
  }

  public attack(): void {
    this.emit(PlayerEvent.ATTACK, {
      x: this._x,
      y: this._y,
      direction: this._direction,
      damage: this.getAttackDamage(),
      tool: this._currentTool
    });
  }

  public takeDamage(amount: number): void {
    this._hp = Math.max(0, this._hp - amount);
    this.emit(PlayerEvent.HP_CHANGED, { hp: this._hp, maxHp: this._maxHp });
  }

  public heal(amount: number): void {
    this._hp = Math.min(this._maxHp, this._hp + amount);
    this.emit(PlayerEvent.HP_CHANGED, { hp: this._hp, maxHp: this._maxHp });
  }

  public addExp(amount: number): void {
    this._exp += amount;
    this.emit(PlayerEvent.EXP_CHANGED, { exp: this._exp, expToNext: this._expToNextLevel });

    while (this._exp >= this._expToNextLevel) {
      this._exp -= this._expToNextLevel;
      this._level++;
      this._expToNextLevel = Math.floor(this._expToNextLevel * 1.5);
      this._maxHp += 20;
      this._hp = this._maxHp;
      this.emit(PlayerEvent.LEVEL_UP, {
        level: this._level,
        maxHp: this._maxHp,
        hp: this._hp
      });
    }
  }

  public selectToolSlot(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= this.toolSlots.length) return;
    this._currentToolSlot = slotIndex;
    this._currentTool = this.toolSlots[slotIndex];
    this.emit(PlayerEvent.TOOL_CHANGED, { tool: this._currentTool, slot: slotIndex });
  }

  public selectTool(tool: ToolType): void {
    this._currentTool = tool;
    this.emit(PlayerEvent.TOOL_CHANGED, { tool: this._currentTool, slot: this._currentToolSlot });
  }

  private syncToolSlotsWithInventory(): void {
    if (this.inventory.hasItem('iron_sword', 1) && this.toolSlots[2] === null) {
      this.toolSlots[2] = ToolType.IRON_SWORD;
    }
    if (this.inventory.hasItem('fence', 1) && this.toolSlots[3] === null) {
      this.toolSlots[3] = ToolType.FENCE;
    }
  }

  public placeFence(worldX: number, worldY: number): boolean {
    if (this._currentTool !== ToolType.FENCE) return false;
    if (!this.inventory.hasItem('fence', 1)) return false;

    const gridX = Math.floor(worldX / WorldManager.TILE_SIZE);
    const gridY = Math.floor(worldY / WorldManager.TILE_SIZE);
    const tile = this.world.getTile(gridX, gridY);
    if (!tile || tile.type !== 'grass') return false;

    this.inventory.removeItem('fence', 1);
    this.world.setTile(gridX, gridY, 'fence' as any);
    return true;
  }

  public getState(): PlayerState {
    return {
      x: this._x,
      y: this._y,
      hp: this._hp,
      maxHp: this._maxHp,
      level: this._level,
      exp: this._exp,
      expToNextLevel: this._expToNextLevel,
      direction: this._direction,
      isMoving: this._isMoving,
      currentTool: this._currentTool
    };
  }

  public get x(): number { return this._x; }
  public get y(): number { return this._y; }
  public get hp(): number { return this._hp; }
  public get maxHp(): number { return this._maxHp; }
  public get level(): number { return this._level; }
  public get exp(): number { return this._exp; }
  public get expToNextLevel(): number { return this._expToNextLevel; }
  public get direction(): number { return this._direction; }
  public get isMoving(): boolean { return this._isMoving; }
  public get currentTool(): ToolType | null { return this._currentTool; }
  public get currentToolSlot(): number { return this._currentToolSlot; }
  public getAnimationFrame(): number { return this.animFrame; }
  public getToolSlots(): (ToolType | null)[] { return [...this.toolSlots]; }
}
