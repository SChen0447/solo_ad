import { create } from 'zustand';
import type { Inspiration, Tag, SearchHistoryItem } from '../types';
import { api } from '../utils/api';

interface AppState {
  inspirations: Inspiration[];
  tags: Tag[];
  searchHistory: SearchHistoryItem[];
  selectedInspirationId: string | null;
  isDetailOpen: boolean;
  isLoading: boolean;
  error: string | null;
  fetchInspirations: () => Promise<void>;
  fetchTags: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updateInspiration: (id: string, data: Partial<Inspiration>) => Promise<void>;
  deleteInspiration: (id: string) => Promise<void>;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  addToSearchHistory: (keyword: string) => void;
  clearSearchHistory: () => void;
}

const SEARCH_HISTORY_KEY = 'inspiration_search_history';

const loadSearchHistory = (): SearchHistoryItem[] => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveSearchHistory = (history: SearchHistoryItem[]) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore
  }
};

export const useStore = create<AppState>((set, get) => ({
  inspirations: [],
  tags: [],
  searchHistory: loadSearchHistory(),
  selectedInspirationId: null,
  isDetailOpen: false,
  isLoading: false,
  error: null,

  fetchInspirations: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getInspirations();
      set({ inspirations: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '未知错误' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getTags();
      set({ tags: data });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '未知错误' });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (id: string) => {
    const inspiration = get().inspirations.find(i => i.id === id);
    if (!inspiration) return;

    const newFavorite = !inspiration.isFavorite;
    set(state => ({
      inspirations: state.inspirations.map(i =>
        i.id === id ? { ...i, isFavorite: newFavorite } : i
      )
    }));

    try {
      await api.updateInspiration(id, { isFavorite: newFavorite });
    } catch (error) {
      set(state => ({
        inspirations: state.inspirations.map(i =>
          i.id === id ? { ...i, isFavorite: !newFavorite } : i
        ),
        error: error instanceof Error ? error.message : '操作失败'
      }));
    }
  },

  updateInspiration: async (id: string, data: Partial<Inspiration>) => {
    try {
      const updated = await api.updateInspiration(id, data);
      set(state => ({
        inspirations: state.inspirations.map(i =>
          i.id === id ? updated : i
        )
      }));
      await get().fetchTags();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新失败' });
      throw error;
    }
  },

  deleteInspiration: async (id: string) => {
    try {
      await api.deleteInspiration(id);
      set(state => ({
        inspirations: state.inspirations.filter(i => i.id !== id),
        isDetailOpen: false,
        selectedInspirationId: null
      }));
      await get().fetchTags();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除失败' });
      throw error;
    }
  },

  openDetail: (id: string) => {
    set({ selectedInspirationId: id, isDetailOpen: true });
  },

  closeDetail: () => {
    set({ isDetailOpen: false });
  },

  addToSearchHistory: (keyword: string) => {
    if (!keyword.trim()) return;
    
    const trimmed = keyword.trim();
    const history = get().searchHistory.filter(h => h.keyword !== trimmed);
    const newHistory = [
      { keyword: trimmed, timestamp: Date.now() },
      ...history
    ].slice(0, 5);
    
    set({ searchHistory: newHistory });
    saveSearchHistory(newHistory);
  },

  clearSearchHistory: () => {
    set({ searchHistory: [] });
    saveSearchHistory([]);
  }
}));
