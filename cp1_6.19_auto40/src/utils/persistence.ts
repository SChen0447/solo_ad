import type { GameState } from '@/types/game';

const STORAGE_KEY = 'starlight-veins-save';
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000;

export function saveGame(state: Partial<GameState>): void {
  try {
    const saveData = {
      planet: state.planet,
      ship: state.ship,
      credits: state.credits,
      tradeRecords: state.tradeRecords,
      travelTime: state.travelTime,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
  } catch (error) {
    console.error('Failed to save game:', error);
  }
}

export function loadGame(): Partial<GameState> | null {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return null;
    return JSON.parse(savedData);
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSaveData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function setupAutoSave(getState: () => Partial<GameState>): () => void {
  const intervalId = setInterval(() => {
    saveGame(getState());
  }, AUTO_SAVE_INTERVAL);

  return () => clearInterval(intervalId);
}

export function getLastSaveTime(): number | null {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return null;
    const data = JSON.parse(savedData);
    return data.savedAt || null;
  } catch {
    return null;
  }
}
