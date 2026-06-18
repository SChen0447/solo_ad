import { create } from 'zustand';
import { InventoryState } from '../modules/player/types';
import { inventoryManager } from '../modules/player/inventory';

interface InventoryStore {
  inventoryState: InventoryState;
  init: () => void;
  useItem: (itemId: string) => { healthRestore: number; hungerRestore: number } | null;
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  inventoryState: inventoryManager.getState(),
  init: () => {
    inventoryManager.subscribe((state) => {
      set({ inventoryState: state });
    });
  },
  useItem: (itemId: string) => {
    return inventoryManager.useItem(itemId);
  },
}));
