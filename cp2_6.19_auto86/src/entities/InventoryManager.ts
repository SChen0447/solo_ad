export enum ItemType {
  WOOD = 'wood',
  STONE = 'stone',
  IRON = 'iron',
  GOLD = 'gold',
  HAMMER = 'hammer',
  SWORD = 'sword',
  WOODEN_FENCE = 'wooden_fence',
  IRON_SWORD = 'iron_sword',
}

export interface Recipe {
  name: string;
  inputs: { type: ItemType; amount: number }[];
  output: { type: ItemType; amount: number };
}

export const RECIPES: Recipe[] = [
  {
    name: '木栅栏',
    inputs: [
      { type: ItemType.WOOD, amount: 3 },
    ],
    output: { type: ItemType.WOODEN_FENCE, amount: 1 },
  },
  {
    name: '铁剑',
    inputs: [
      { type: ItemType.STONE, amount: 2 },
      { type: ItemType.IRON, amount: 1 },
    ],
    output: { type: ItemType.IRON_SWORD, amount: 1 },
  },
];

export class InventoryManager {
  private items: Map<ItemType, number> = new Map();
  private changeCallbacks: (() => void)[] = [];

  constructor() {
    this.items.set(ItemType.WOOD, 0);
    this.items.set(ItemType.STONE, 0);
    this.items.set(ItemType.IRON, 0);
    this.items.set(ItemType.GOLD, 0);
    this.items.set(ItemType.HAMMER, 1);
    this.items.set(ItemType.SWORD, 1);
    this.items.set(ItemType.WOODEN_FENCE, 0);
    this.items.set(ItemType.IRON_SWORD, 0);
  }

  addItem(type: ItemType, amount: number): void {
    const current = this.items.get(type) || 0;
    this.items.set(type, current + amount);
    this.notifyChange();
  }

  removeItem(type: ItemType, amount: number): boolean {
    const current = this.items.get(type) || 0;
    if (current < amount) return false;
    this.items.set(type, current - amount);
    this.notifyChange();
    return true;
  }

  hasItem(type: ItemType, amount: number): boolean {
    return (this.items.get(type) || 0) >= amount;
  }

  getCount(type: ItemType): number {
    return this.items.get(type) || 0;
  }

  getAllItems(): Map<ItemType, number> {
    return new Map(this.items);
  }

  canCraft(recipe: Recipe): boolean {
    for (const input of recipe.inputs) {
      if (!this.hasItem(input.type, input.amount)) return false;
    }
    return true;
  }

  craft(recipe: Recipe): boolean {
    if (!this.canCraft(recipe)) return false;
    for (const input of recipe.inputs) {
      this.removeItem(input.type, input.amount);
    }
    this.addItem(recipe.output.type, recipe.output.amount);
    return true;
  }

  onInventoryChange(callback: () => void): void {
    this.changeCallbacks.push(callback);
  }

  private notifyChange(): void {
    for (const cb of this.changeCallbacks) {
      cb();
    }
  }
}
