import type { Item, ItemType } from '../types';

const ITEM_NAMES: Record<ItemType, string> = {
  healthPotion: '生命药水',
  fireScroll: '火焰卷轴',
  key: '钥匙'
};

const ITEM_DESCRIPTIONS: Record<ItemType, string> = {
  healthPotion: '回复30点生命值',
  fireScroll: '对3x3范围敌人造成15伤害',
  key: '可以开启一扇门'
};

export class Inventory {
  private items: Map<ItemType, Item> = new Map();

  constructor() {
    this.addItem({ type: 'healthPotion', name: ITEM_NAMES.healthPotion, description: ITEM_DESCRIPTIONS.healthPotion, count: 2 });
  }

  public addItem(item: Item): void {
    const existing = this.items.get(item.type);
    if (existing) {
      existing.count += item.count;
    } else {
      this.items.set(item.type, { ...item });
    }
  }

  public removeItem(type: ItemType, count: number = 1): boolean {
    const existing = this.items.get(type);
    if (!existing || existing.count < count) return false;

    existing.count -= count;
    if (existing.count <= 0) {
      this.items.delete(type);
    }
    return true;
  }

  public getItem(type: ItemType): Item | undefined {
    return this.items.get(type);
  }

  public getAllItems(): Item[] {
    return Array.from(this.items.values());
  }

  public getTotalCount(): number {
    let total = 0;
    for (const item of this.items.values()) {
      total += item.count;
    }
    return total;
  }

  public hasItem(type: ItemType): boolean {
    const item = this.items.get(type);
    return item !== undefined && item.count > 0;
  }

  public static createItem(type: ItemType, count: number = 1): Item {
    return {
      type,
      name: ITEM_NAMES[type],
      description: ITEM_DESCRIPTIONS[type],
      count
    };
  }

  public static getRandomItem(): Item {
    const types: ItemType[] = ['healthPotion', 'fireScroll', 'key'];
    const weights = [0.4, 0.35, 0.25];
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        return Inventory.createItem(types[i], 1);
      }
    }
    return Inventory.createItem('healthPotion', 1);
  }
}
