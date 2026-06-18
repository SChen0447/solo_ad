import { v4 as uuidv4 } from 'uuid';

export interface Item {
  id: string;
  type: 'food' | 'water';
  name: string;
  healthRestore: number;
  hungerRestore: number;
  quantity: number;
  icon: string;
}

export interface InventoryState {
  items: Item[];
  maxSlots: number;
  weightMultiplier: number;
}

export interface PlayerState {
  health: number;
  hunger: number;
  baseSpeed: number;
  speedMultiplier: number;
  temperature: number;
}

export const INITIAL_PLAYER_STATE: PlayerState = {
  health: 100,
  hunger: 100,
  baseSpeed: 1.0,
  speedMultiplier: 1.0,
  temperature: 25,
};

export const createInitialInventory = (): Item[] => [
  {
    id: uuidv4(),
    type: 'food',
    name: '野果',
    healthRestore: 5,
    hungerRestore: 15,
    quantity: 3,
    icon: '🍎',
  },
  {
    id: uuidv4(),
    type: 'water',
    name: '清水',
    healthRestore: 3,
    hungerRestore: 10,
    quantity: 2,
    icon: '💧',
  },
  {
    id: uuidv4(),
    type: 'food',
    name: '烤肉',
    healthRestore: 10,
    hungerRestore: 25,
    quantity: 1,
    icon: '🍖',
  },
];
