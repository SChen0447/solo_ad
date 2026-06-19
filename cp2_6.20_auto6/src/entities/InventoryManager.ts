import Phaser from 'phaser';

export interface InventoryItem {
  id: string;
  name: string;
  iconKey: string;
  quantity: number;
  maxStack: number;
}

export type ItemType = 'wood' | 'stone' | 'iron' | 'gold' | 'fence' | 'iron_sword';

export const ITEM_DEFS: Record<ItemType, Omit<InventoryItem, 'quantity'>> = {
  wood: { id: 'wood', name: '木材', iconKey: 'icon_wood', maxStack: 99 },
  stone: { id: 'stone', name: '石头', iconKey: 'icon_stone', maxStack: 99 },
  iron: { id: 'iron', name: '铁锭', iconKey: 'icon_iron', maxStack: 99 },
  gold: { id: 'gold', name: '金币', iconKey: 'icon_gold', maxStack: 999 },
  fence: { id: 'fence', name: '木栅栏', iconKey: 'icon_fence', maxStack: 99 },
  iron_sword: { id: 'iron_sword', name: '铁剑', iconKey: 'icon_sword_iron', maxStack: 1 }
};

export enum ToolType {
  HAMMER = 'hammer',
  SWORD = 'sword',
  IRON_SWORD = 'iron_sword',
  FENCE = 'fence'
}

export const TOOL_SLOTS: (ToolType | null)[] = [ToolType.HAMMER, ToolType.SWORD, null, null];

export class InventoryManager extends Phaser.Events.EventEmitter {
  private items: Map<string, number>;

  constructor() {
    super();
    this.items = new Map();
    this.items.set('wood', 0);
    this.items.set('stone', 0);
    this.items.set('iron', 0);
    this.items.set('gold', 0);
  }

  public addItem(itemId: string, quantity: number = 1): boolean {
    const current = this.items.get(itemId) || 0;
    const def = ITEM_DEFS[itemId as ItemType];
    const maxStack = def ? def.maxStack : 99;
    const newQuantity = Math.min(current + quantity, maxStack);

    if (newQuantity > current) {
      this.items.set(itemId, newQuantity);
      this.emit('inventoryChanged', { itemId, quantity: newQuantity, delta: newQuantity - current });
      return true;
    }
    return false;
  }

  public removeItem(itemId: string, quantity: number = 1): boolean {
    const current = this.items.get(itemId) || 0;
    if (current < quantity) return false;

    const newQuantity = current - quantity;
    this.items.set(itemId, newQuantity);
    this.emit('inventoryChanged', { itemId, quantity: newQuantity, delta: -quantity });
    return true;
  }

  public hasItem(itemId: string, quantity: number = 1): boolean {
    const current = this.items.get(itemId) || 0;
    return current >= quantity;
  }

  public getItemCount(itemId: string): number {
    return this.items.get(itemId) || 0;
  }

  public getItems(): Map<string, number> {
    return new Map(this.items);
  }

  public getInventoryList(): InventoryItem[] {
    const list: InventoryItem[] = [];
    for (const [itemId, count] of this.items) {
      if (count > 0) {
        const def = ITEM_DEFS[itemId as ItemType];
        if (def) {
          list.push({ ...def, quantity: count });
        }
      }
    }
    return list;
  }

  public canCraft(recipe: { inputs: { itemId: string; count: number }[] }): boolean {
    for (const input of recipe.inputs) {
      if (!this.hasItem(input.itemId, input.count)) {
        return false;
      }
    }
    return true;
  }

  public craft(recipe: { inputs: { itemId: string; count: number }[]; output: { itemId: string; count: number } }): boolean {
    if (!this.canCraft(recipe)) return false;

    for (const input of recipe.inputs) {
      this.removeItem(input.itemId, input.count);
    }
    this.addItem(recipe.output.itemId, recipe.output.count);
    this.emit('craftSuccess', { output: recipe.output });
    return true;
  }
}
