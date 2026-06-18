import type { SavedScheme } from '@/types';

const STORAGE_KEY = 'gradient-studio-saved-schemes';

export function loadSavedSchemes(): SavedScheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSchemesToStorage(schemes: SavedScheme[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes));
  } catch {
    // storage full or unavailable
  }
}

export function addSavedScheme(scheme: SavedScheme): SavedScheme[] {
  const schemes = loadSavedSchemes();
  const existingIdx = schemes.findIndex((s) => s.id === scheme.id);
  if (existingIdx >= 0) {
    schemes[existingIdx] = scheme;
  } else {
    schemes.unshift(scheme);
  }
  saveSchemesToStorage(schemes);
  return schemes;
}

export function deleteSavedScheme(id: string): SavedScheme[] {
  const schemes = loadSavedSchemes().filter((s) => s.id !== id);
  saveSchemesToStorage(schemes);
  return schemes;
}
