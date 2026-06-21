import Phaser from 'phaser';
import {
  ITEM_COOLDOWN,
  MAX_ITEMS,
  CELL_SIZE,
  ITEM_TYPES,
  type ItemType,
  COLORS,
  GRID_SIZE
} from './Defines';

export interface PlacedItem {
  id: number;
  gridX: number;
  gridY: number;
  type: ItemType;
  sprite: Phaser.GameObjects.Rectangle | null;
}

export class ItemManager {
  private scene: Phaser.Scene;
  private items: PlacedItem[] = [];
  private itemIdCounter = 0;
  private lastPlaceTime = 0;
  private onCooldownChange: ((cooldownPercent: number, isReady: boolean) => void) | null = null;
  private onItemsChanged: ((items: PlacedItem[]) => void) | null = null;
  private placeCount = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setOnCooldownChange(callback: (cooldownPercent: number, isReady: boolean) => void): void {
    this.onCooldownChange = callback;
  }

  setOnItemsChanged(callback: (items: PlacedItem[]) => void): void {
    this.onItemsChanged = callback;
  }

  getPlaceCount(): number {
    return this.placeCount;
  }

  canPlaceItem(): boolean {
    const now = this.scene.time.now;
    return now - this.lastPlaceTime >= ITEM_COOLDOWN && this.items.length < MAX_ITEMS;
  }

  getCooldownPercent(): number {
    const now = this.scene.time.now;
    const elapsed = now - this.lastPlaceTime;
    if (elapsed >= ITEM_COOLDOWN) return 1;
    return elapsed / ITEM_COOLDOWN;
  }

  getItems(): PlacedItem[] {
    return [...this.items];
  }

  placeItem(gridX: number, gridY: number): PlacedItem | null {
    if (!this.canPlaceItem()) return null;

    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const item: PlacedItem = {
      id: this.itemIdCounter++,
      gridX,
      gridY,
      type,
      sprite: null
    };

    this.items.push(item);
    this.lastPlaceTime = this.scene.time.now;
    this.placeCount++;

    if (this.items.length > MAX_ITEMS) {
      const removedItem = this.items.shift();
      if (removedItem?.sprite) {
        removedItem.sprite.destroy();
      }
    }

    this.notifyItemsChanged();
    return item;
  }

  update(time: number): void {
    if (this.onCooldownChange) {
      const percent = this.getCooldownPercent();
      const isReady = percent >= 1;
      this.onCooldownChange(percent, isReady);
    }
  }

  private notifyItemsChanged(): void {
    if (this.onItemsChanged) {
      this.onItemsChanged([...this.items]);
    }
  }

  createItemSprite(item: PlacedItem, container?: Phaser.GameObjects.Container): Phaser.GameObjects.Rectangle {
    const x = item.gridX * CELL_SIZE + CELL_SIZE / 2;
    const y = item.gridY * CELL_SIZE + CELL_SIZE / 2;
    const size = CELL_SIZE * 0.8;

    let color: number;
    switch (item.type) {
      case 'box':
        color = Phaser.Display.Color.HexStringToColor(COLORS.ITEM_BOX).color;
        break;
      case 'bush':
        color = Phaser.Display.Color.HexStringToColor(COLORS.ITEM_BUSH).color;
        break;
      case 'sign':
        color = Phaser.Display.Color.HexStringToColor(COLORS.ITEM_SIGN).color;
        break;
      default:
        color = 0xffffff;
    }

    const sprite = this.scene.add.rectangle(x, y, size, size, color);
    sprite.setStrokeStyle(2, 0x000000, 0.3);

    if (item.type === 'bush') {
      sprite.setFillStyle(color);
    } else if (item.type === 'sign') {
      sprite.setSize(size * 0.6, size);
    }

    if (container) {
      container.add(sprite);
    }

    item.sprite = sprite;
    return sprite;
  }

  destroyAll(): void {
    for (const item of this.items) {
      if (item.sprite) {
        item.sprite.destroy();
      }
    }
    this.items = [];
  }

  isPositionOccupied(gridX: number, gridY: number): boolean {
    return this.items.some(item => item.gridX === gridX && item.gridY === gridY);
  }

  reset(): void {
    this.destroyAll();
    this.lastPlaceTime = 0;
    this.placeCount = 0;
    this.itemIdCounter = 0;
    this.notifyItemsChanged();
  }
}
