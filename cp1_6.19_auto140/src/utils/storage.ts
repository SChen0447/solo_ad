const STORAGE_KEY = 'stellar_trader_save';

export interface SaveData {
  playerState: unknown;
  stations: unknown;
  seed: number;
  lastSave: number;
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save game:', e);
  }
}

export function loadGame(): SaveData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load game:', e);
  }
  return null;
}

export function clearGame(): void {
  localStorage.removeItem(STORAGE_KEY);
}
