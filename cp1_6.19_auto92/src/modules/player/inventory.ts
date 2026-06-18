import { Item, InventoryState, createInitialInventory } from './types';

const MAX_SLOTS = 10;
const WEIGHT_PER_ITEM = 0.05;
const SPEED_PENALTY_THRESHOLD = 5;
const SPEED_PENALTY = 0.05;

export class InventoryManager {
  private state: InventoryState;
  private listeners: Set<(state: InventoryState) => void> = new Set();

  constructor() {
    this.state = {
      items: createInitialInventory(),
      maxSlots: MAX_SLOTS,
      weightMultiplier: 1,
    };
    this.calculateWeightMultiplier();
  }

  getState(): InventoryState {
    return {
      ...this.state,
      items: this.state.items.map((item) => ({ ...item })),
    };
  }

  getWeightMultiplier(): number {
    return this.state.weightMultiplier;
  }

  private calculateWeightMultiplier(): void {
    const totalItems = this.state.items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const weightPenalty = Math.max(0, totalItems - SPEED_PENALTY_THRESHOLD) * WEIGHT_PER_ITEM;
    this.state.weightMultiplier = 1 - weightPenalty;
  }

  addItem(item: Omit<Item, 'id'> & { id?: string }): boolean {
    const existingIndex = this.state.items.findIndex(
      (i) => i.name === item.name && i.type === item.type
    );

    if (existingIndex >= 0) {
      this.state.items[existingIndex].quantity += item.quantity;
      this.calculateWeightMultiplier();
      this.notifyListeners();
      return true;
    }

    if (this.state.items.length >= this.state.maxSlots) {
      return false;
    }

    this.state.items.push({
      ...item,
      id: item.id || crypto.randomUUID(),
    } as Item);
    this.calculateWeightMultiplier();
    this.notifyListeners();
    return true;
  }

  useItem(itemId: string): { healthRestore: number; hungerRestore: number } | null {
    const itemIndex = this.state.items.findIndex((i) => i.id === itemId);

    if (itemIndex < 0) {
      return null;
    }

    const item = this.state.items[itemIndex];
    if (item.quantity <= 0) {
      return null;
    }

    item.quantity -= 1;

    if (item.quantity <= 0) {
      this.state.items.splice(itemIndex, 1);
    }

    this.calculateWeightMultiplier();
    this.notifyListeners();

    return {
      healthRestore: item.healthRestore,
      hungerRestore: item.hungerRestore,
    };
  }

  getItem(itemId: string): Item | undefined {
    return this.state.items.find((i) => i.id === itemId);
  }

  subscribe(listener: (state: InventoryState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }
}

export const inventoryManager = new InventoryManager();
