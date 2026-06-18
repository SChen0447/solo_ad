import type { Ship, BattleResult } from '../store/gameStore';

const STORAGE_KEY = 'surge_battle_save';

export interface SavedGame {
  gold: number;
  ships: Ship[];
  lastBattleResult: BattleResult | null;
}

export function saveGame(state: SavedGame): void {
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function loadGame(): SavedGame | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as SavedGame;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear save:', e);
  }
}
