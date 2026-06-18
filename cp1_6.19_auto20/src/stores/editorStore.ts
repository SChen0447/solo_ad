import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { get, set } from 'idb-keyval';

export interface Draft {
  id: string;
  title: string;
  content: string;
  cursorPosition: number;
  createdAt: number;
  updatedAt: number;
}

interface EditorState {
  drafts: Draft[];
  currentDraftId: string | null;
  searchQuery: string;
  splitRatio: number;
  isMobile: boolean;
  activeTab: 'editor' | 'preview';
  lastSavedContent: string;
  createDraft: () => void;
  deleteDraft: (id: string) => void;
  loadDraft: (id: string) => void;
  updateContent: (content: string, cursorPosition: number) => void;
  setSearchQuery: (query: string) => void;
  setSplitRatio: (ratio: number) => void;
  setIsMobile: (isMobile: boolean) => void;
  setActiveTab: (tab: 'editor' | 'preview') => void;
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  getCurrentDraft: () => Draft | undefined;
  getFilteredDrafts: () => Draft[];
}

const STORAGE_KEY = 'xingwenjian_drafts';
const CURRENT_DRAFT_KEY = 'xingwenjian_current_draft';
const AUTO_SAVE_INTERVAL = 30000;

const extractTitle = (content: string): string => {
  const firstLine = content.trim().split('\n')[0] || '';
  const titleMatch = firstLine.match(/^#\s+(.+)$/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  return firstLine.slice(0, 50) || '无标题草稿';
};

export const useEditorStore = create<EditorState>((set, get) => ({
  drafts: [],
  currentDraftId: null,
  searchQuery: '',
  splitRatio: 0.5,
  isMobile: false,
  activeTab: 'editor',
  lastSavedContent: '',

  createDraft: () => {
    const now = Date.now();
    const newDraft: Draft = {
      id: uuidv4(),
      title: '无标题草稿',
      content: '',
      cursorPosition: 0,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      drafts: [newDraft, ...state.drafts],
      currentDraftId: newDraft.id,
      lastSavedContent: '',
    }));
  },

  deleteDraft: (id: string) => {
    set((state) => {
      const newDrafts = state.drafts.filter((d) => d.id !== id);
      let newCurrentId = state.currentDraftId;
      if (state.currentDraftId === id) {
        newCurrentId = newDrafts.length > 0 ? newDrafts[0].id : null;
      }
      return {
        drafts: newDrafts,
        currentDraftId: newCurrentId,
      };
    });
  },

  loadDraft: (id: string) => {
    set({ currentDraftId: id });
  },

  updateContent: (content: string, cursorPosition: number) => {
    set((state) => {
      if (!state.currentDraftId) return state;
      const title = extractTitle(content);
      return {
        drafts: state.drafts.map((draft) =>
          draft.id === state.currentDraftId
            ? { ...draft, content, title, cursorPosition, updatedAt: Date.now() }
            : draft
        ),
      };
    });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSplitRatio: (ratio: number) => {
    set({ splitRatio: Math.max(0.2, Math.min(0.8, ratio)) });
  },

  setIsMobile: (isMobile: boolean) => {
    set({ isMobile });
  },

  setActiveTab: (tab: 'editor' | 'preview') => {
    set({ activeTab: tab });
  },

  saveToStorage: async () => {
    const state = get();
    if (state.drafts.length === 0) return;
    
    const startTime = performance.now();
    try {
      await set(STORAGE_KEY, state.drafts);
      if (state.currentDraftId) {
        await set(CURRENT_DRAFT_KEY, state.currentDraftId);
      }
      const endTime = performance.now();
      if (endTime - startTime > 50) {
        console.warn(`IndexedDB write took ${endTime - startTime}ms, exceeds 50ms limit`);
      }
      set({ lastSavedContent: state.getCurrentDraft()?.content || '' });
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
    }
  },

  loadFromStorage: async () => {
    try {
      const [drafts, currentDraftId] = await Promise.all([
        get<Draft[]>(STORAGE_KEY),
        get<string>(CURRENT_DRAFT_KEY),
      ]);
      
      if (drafts && drafts.length > 0) {
        set({
          drafts,
          currentDraftId: currentDraftId || drafts[0].id,
          lastSavedContent: drafts.find((d) => d.id === (currentDraftId || drafts[0].id))?.content || '',
        });
      } else {
        get().createDraft();
      }
    } catch (error) {
      console.error('Failed to load from IndexedDB:', error);
      get().createDraft();
    }
  },

  getCurrentDraft: () => {
    const state = get();
    return state.drafts.find((d) => d.id === state.currentDraftId);
  },

  getFilteredDrafts: () => {
    const state = get();
    if (!state.searchQuery.trim()) return state.drafts;
    const query = state.searchQuery.toLowerCase();
    return state.drafts.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query)
    );
  },
}));

let autoSaveTimer: number | null = null;

export const startAutoSave = () => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = window.setInterval(() => {
    const state = useEditorStore.getState();
    const currentDraft = state.getCurrentDraft();
    if (currentDraft && currentDraft.content !== state.lastSavedContent) {
      state.saveToStorage();
    }
  }, AUTO_SAVE_INTERVAL);
};

export const stopAutoSave = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  if (weeks < 4) return `${weeks}周前`;
  
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
};
