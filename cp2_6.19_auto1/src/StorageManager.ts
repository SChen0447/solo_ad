export interface SavedPalette {
  id: string;
  name: string;
  baseColor: string;
  colors: string[];
  schemeType: string;
  savedAt: number;
}

const STORAGE_KEY = 'color-palette-favorites';

export function loadFavorites(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPalette[];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: SavedPalette[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
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
