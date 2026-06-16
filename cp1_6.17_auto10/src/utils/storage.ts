import { AppState, Deck } from '../types';

const STORAGE_KEY = 'flashcard_app_state_v1';

export function loadState(): AppState {
  try {
    const start = performance.now();
    const raw = localStorage.getItem(STORAGE_KEY);
    const result: AppState = raw
      ? JSON.parse(raw)
      : { decks: [], reviewHistory: [] };
    const elapsed = performance.now() - start;
    if (elapsed > 3) {
      console.warn(`localStorage load took ${elapsed.toFixed(2)}ms`);
    }
    return result;
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
    return { decks: [], reviewHistory: [] };
  }
}

export function saveState(state: AppState): void {
  try {
    const start = performance.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const elapsed = performance.now() - start;
    if (elapsed > 3) {
      console.warn(`localStorage save took ${elapsed.toFixed(2)}ms`);
    }
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function generateDeckId(): string {
  return `deck_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createNewDeck(name: string, description: string = ''): Deck {
  return {
    id: generateDeckId(),
    name,
    description,
    cards: [],
    createdAt: Date.now(),
  };
}
