import { create } from 'zustand';
import type { ScriptSection, Storyboard } from '../modules/scriptEngine';
import type { Sentiment, MusicSuggestion } from '../modules/sentimentAnalyzer';

export type Page = 'editor' | 'export';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
  timestamp: number;
}

interface AppState {
  page: Page;
  topic: string;
  keywords: string;
  scriptSections: ScriptSection[];
  expandedSectionId: string | null;
  editingStoryboardId: string | null;
  editingSectionId: string | null;
  selectedSentiment: Sentiment | null;
  selectedText: string;
  musicSuggestions: MusicSuggestion[];
  currentlyPlayingId: string | null;
  notifications: Notification[];
  hasNewContent: boolean;
  shareCode: string | null;
  isMobileMenuOpen: boolean;
  readOnlyMode: boolean;

  setPage: (page: Page) => void;
  setTopic: (v: string) => void;
  setKeywords: (v: string) => void;
  setScriptSections: (sections: ScriptSection[]) => void;
  setExpandedSectionId: (id: string | null) => void;
  setEditingStoryboard: (sectionId: string | null, storyboardId: string | null) => void;
  updateStoryboard: (sectionId: string, storyboardId: string, data: Partial<Storyboard>) => void;
  reorderStoryboards: (sectionId: string, fromIndex: number, toIndex: number) => void;
  setSelectedSentiment: (s: Sentiment | null, text: string) => void;
  setMusicSuggestions: (suggestions: MusicSuggestion[]) => void;
  setCurrentlyPlayingId: (id: string | null) => void;
  addNotification: (msg: string, type?: 'success' | 'info' | 'error') => void;
  clearNotification: (id: string) => void;
  dismissNewContent: () => void;
  setShareCode: (code: string | null) => void;
  setMobileMenuOpen: (v: boolean) => void;
  setReadOnlyMode: (v: boolean) => void;
  resetAll: () => void;
}

const initialState = {
  page: 'editor' as Page,
  topic: '',
  keywords: '',
  scriptSections: [] as ScriptSection[],
  expandedSectionId: null as string | null,
  editingStoryboardId: null as string | null,
  editingSectionId: null as string | null,
  selectedSentiment: null as Sentiment | null,
  selectedText: '',
  musicSuggestions: [] as MusicSuggestion[],
  currentlyPlayingId: null as string | null,
  notifications: [] as Notification[],
  hasNewContent: false,
  shareCode: null as string | null,
  isMobileMenuOpen: false,
  readOnlyMode: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setPage: (page) => set({ page }),
  setTopic: (topic) => set({ topic }),
  setKeywords: (keywords) => set({ keywords }),

  setScriptSections: (sections) => set({
    scriptSections: sections,
    hasNewContent: true,
    expandedSectionId: null,
  }),

  setExpandedSectionId: (id) => set({ expandedSectionId: id }),

  setEditingStoryboard: (sectionId, storyboardId) => set({
    editingSectionId: sectionId,
    editingStoryboardId: storyboardId,
  }),

  updateStoryboard: (sectionId, storyboardId, data) => set({
    scriptSections: get().scriptSections.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        storyboards: sec.storyboards.map(sb =>
          sb.id === storyboardId ? { ...sb, ...data } : sb
        ),
      };
    }),
  }),

  reorderStoryboards: (sectionId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    set({
      scriptSections: get().scriptSections.map(sec => {
        if (sec.id !== sectionId) return sec;
        const sbs = [...sec.storyboards];
        const [moved] = sbs.splice(fromIndex, 1);
        sbs.splice(toIndex, 0, moved);
        return { ...sec, storyboards: sbs };
      }),
    });
  },

  setSelectedSentiment: (s, text) => set({ selectedSentiment: s, selectedText: text }),
  setMusicSuggestions: (suggestions) => set({ musicSuggestions: suggestions }),
  setCurrentlyPlayingId: (id) => set({ currentlyPlayingId: id }),

  addNotification: (msg, type = 'info') => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const n: Notification = { id, message: msg, type, timestamp: Date.now() };
    set({ notifications: [...get().notifications, n] });
    setTimeout(() => {
      const current = get().notifications;
      if (current.find(x => x.id === id)) {
        set({ notifications: current.filter(x => x.id !== id) });
      }
    }, 3500);
  },

  clearNotification: (id) => set({
    notifications: get().notifications.filter(n => n.id !== id),
  }),

  dismissNewContent: () => set({ hasNewContent: false }),
  setShareCode: (code) => set({ shareCode: code }),
  setMobileMenuOpen: (v) => set({ isMobileMenuOpen: v }),
  setReadOnlyMode: (v) => set({ readOnlyMode: v }),

  resetAll: () => set({ ...initialState }),
}));
