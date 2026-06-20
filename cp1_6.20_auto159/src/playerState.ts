import type { MineralRarity } from './planetEngine';
import type { DrillLevel } from './drillLogic';

export type PlayerInventory = Record<MineralRarity, number>;

export interface PlayerState {
  gold: number;
  drillLevel: DrillLevel;
  inventory: PlayerInventory;
  shipPosition: { x: number; y: number };
}

export function createPlayerState(): PlayerState {
  return {
    gold: 100,
    drillLevel: 'copper',
    inventory: {
      common: 0,
      rare: 0,
      legendary: 0,
    },
    shipPosition: { x: 0, y: 0 },
  };
}

export function addMineral(
  state: PlayerState,
  rarity: MineralRarity,
  amount: number
): void {
  if (amount <= 0) return;
  state.inventory[rarity] += amount;
}

export function removeMineral(
  state: PlayerState,
  rarity: MineralRarity,
  amount: number
): boolean {
  if (state.inventory[rarity] < amount) {
    return false;
  }
  state.inventory[rarity] -= amount;
  return true;
}

export function addGold(state: PlayerState, amount: number): void {
  state.gold += amount;
}

export function spendGold(state: PlayerState, amount: number): boolean {
  if (state.gold < amount) {
    return false;
  }
  state.gold -= amount;
  return true;
}

export function getTotalMinerals(inventory: PlayerInventory): number {
  return inventory.common + inventory.rare + inventory.legendary;
}

export function setShipPosition(
  state: PlayerState,
  x: number,
  y: number
): void {
  state.shipPosition = { x, y };
}
