import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { StoryCardData, AudioState, PlayerState, TransitionType } from '@/types';

interface AppStore {
  cards: StoryCardData[];
  selectedCardId: string | null;
  audio: AudioState | null;
  player: PlayerState;

  addCard: () => void;
  removeCard: (id: string) => void;
  updateCard: (id: string, updates: Partial<StoryCardData>) => void;
  reorderCards: (fromIndex: number, toIndex: number) => void;
  selectCard: (id: string | null) => void;
  setAudio: (audio: AudioState | null) => void;
  setVolume: (volume: number) => void;
  setPlayerState: (state: Partial<PlayerState>) => void;
  getTotalDuration: () => number;
}

export const useAppStore = create<AppStore>((set, get) => ({
  cards: [],
  selectedCardId: null,
  audio: null,
  player: {
    isPlaying: false,
    isPreviewOpen: false,
    currentIndex: 0,
    elapsedTime: 0,
    totalDuration: 0,
  },

  addCard: () => {
    const cards = get().cards;
    const newCard: StoryCardData = {
      id: uuidv4(),
      title: '',
      content: '',
      bgColor: '#ffffff',
      imageUrl: '',
      transition: 'fadeInOut',
      duration: 3,
      order: cards.length,
    };
    set({ cards: [...cards, newCard], selectedCardId: newCard.id });
  },

  removeCard: (id) => {
    const cards = get().cards.filter((c) => c.id !== id);
    const reordered = cards.map((c, i) => ({ ...c, order: i }));
    const selectedCardId = get().selectedCardId === id ? null : get().selectedCardId;
    set({ cards: reordered, selectedCardId });
  },

  updateCard: (id, updates) => {
    set({
      cards: get().cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  },

  reorderCards: (fromIndex, toIndex) => {
    const cards = [...get().cards];
    const [moved] = cards.splice(fromIndex, 1);
    cards.splice(toIndex, 0, moved);
    const reordered = cards.map((c, i) => ({ ...c, order: i }));
    set({ cards: reordered });
  },

  selectCard: (id) => set({ selectedCardId: id }),

  setAudio: (audio) => set({ audio }),

  setVolume: (volume) => {
    const audio = get().audio;
    if (audio) {
      set({ audio: { ...audio, volume } });
    }
  },

  setPlayerState: (state) => {
    set({ player: { ...get().player, ...state } });
  },

  getTotalDuration: () => {
    return get().cards.reduce((sum, c) => sum + c.duration, 0);
  },
}));

export const TRANSITION_LABELS: Record<TransitionType, string> = {
  fadeInOut: '淡入淡出',
  slideUp: '从下滑入',
  slideDown: '从上滑入',
  slideLeft: '从右滑入',
  slideRight: '从左滑入',
  zoom: '缩放',
};

export const DEFAULT_CARD_COLORS = [
  '#ffffff', '#fef3c7', '#dcfce7', '#dbeafe',
  '#f3e8ff', '#ffe4e6', '#fce7f3', '#e0e7ff',
];
