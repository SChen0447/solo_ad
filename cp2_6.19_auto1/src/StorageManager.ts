export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface SavedPalette {
  id: string;
  name: string;
  baseColor: string;
  hsv: HSV;
  colors: string[];
  schemeType: string;
  savedAt: number;
}

interface StorageData {
  version: number;
  items: SavedPalette[];
}

const STORAGE_KEY = 'color-palette-favorites';
const CURRENT_VERSION = 2;

function isValidHexColor(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^#[0-9a-f]{6}$/i.test(val);
}

function isValidHSV(val: unknown): val is HSV {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  if (typeof obj.h !== 'number') return false;
  if (typeof obj.s !== 'number') return false;
  if (typeof obj.v !== 'number') return false;
  if (obj.h < 0 || obj.h > 360) return false;
  if (obj.s < 0 || obj.s > 1) return false;
  if (obj.v < 0 || obj.v > 1) return false;
  return true;
}

function isValidSavedPalette(val: unknown): val is SavedPalette {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
  if (typeof obj.name !== 'string') return false;
  if (!isValidHexColor(obj.baseColor)) return false;
  if (!isValidHSV(obj.hsv)) return false;
  if (!Array.isArray(obj.colors) || obj.colors.length === 0) return false;
  if (!obj.colors.every((c: unknown) => isValidHexColor(c))) return false;
  if (typeof obj.schemeType !== 'string') return false;
  if (typeof obj.savedAt !== 'number') return false;
  return true;
}

function validateStorageData(raw: unknown): SavedPalette[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = raw as Record<string, unknown>;
  if (typeof data.version !== 'number') return [];
  if (!Array.isArray(data.items)) return [];
  const items: SavedPalette[] = [];
  for (const item of data.items) {
    if (isValidSavedPalette(item)) {
      items.push(item);
    }
  }
  return items;
}

export function loadFavorites(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return validateStorageData(parsed);
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // unable to clear
    }
    return [];
  }
}

function serialize(items: SavedPalette[]): string {
  const data: StorageData = {
    version: CURRENT_VERSION,
    items,
  };
  return JSON.stringify(data);
}

export function saveFavorites(favorites: SavedPalette[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(favorites));
  } catch {
    // storage full or unavailable
  }
}

export function addFavorite(palette: SavedPalette): SavedPalette[] {
  const favorites = loadFavorites();
  favorites.unshift(palette);
  saveFavorites(favorites);
  return favorites;
}

export function removeFavorite(id: string): SavedPalette[] {
  const favorites = loadFavorites().filter((f) => f.id !== id);
  saveFavorites(favorites);
  return favorites;
}

export function clearFavorites(): SavedPalette[] {
  saveFavorites([]);
  return [];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
