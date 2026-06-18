import { InventorySlot } from '../types';

export class Inventory {
  private slots: InventorySlot[] = [];
  private readonly MAX_TYPES = 20;
  private readonly MAX_COUNT = 99;
  private onChange: (() => void) | null = null;

  setOnChange(cb: () => void): void {
    this.onChange = cb;
  }

  addSpore(speciesId: number, count: number = 1): boolean {
    const existing = this.slots.find(s => s.speciesId === speciesId);
    if (existing) {
      if (existing.count >= this.MAX_COUNT) return false;
      existing.count = Math.min(existing.count + count, this.MAX_COUNT);
      if (this.onChange) this.onChange();
      return true;
    }

    if (this.slots.length >= this.MAX_TYPES) return false;

    this.slots.push({ speciesId, count });
    if (this.onChange) this.onChange();
    return true;
  }

  removeSpore(speciesId: number, count: number = 1): boolean {
    const existing = this.slots.find(s => s.speciesId === speciesId);
    if (!existing || existing.count < count) return false;

    existing.count -= count;
    if (existing.count <= 0) {
      this.slots = this.slots.filter(s => s.speciesId !== speciesId);
    }
    if (this.onChange) this.onChange();
    return true;
  }

  getSlots(): InventorySlot[] {
    return [...this.slots];
  }

  getCount(speciesId: number): number {
    const slot = this.slots.find(s => s.speciesId === speciesId);
    return slot ? slot.count : 0;
  }

  hasSpore(speciesId: number): boolean {
    return this.slots.some(s => s.speciesId === speciesId);
  }

  getTotalTypes(): number {
    return this.slots.length;
  }
}
