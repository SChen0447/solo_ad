import { create } from 'zustand';

export type CardType = 'project' | 'text' | 'contact';

export interface SocialLink {
  id: string;
  type: 'github' | 'twitter' | 'linkedin' | 'email';
  url: string;
}

export interface CardData {
  id: string;
  type: CardType;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  description?: string;
  image?: string;
  content?: string;
  links?: SocialLink[];
}

export interface LayoutConfig {
  cols: number;
  rowHeight: number;
  width: number;
}

const MAX_HISTORY = 50;

interface PortfolioStore {
  cards: CardData[];
  selectedCardId: string | null;
  layoutConfig: LayoutConfig;
  nextY: number;
  history: CardData[][];
  redoStack: CardData[][];
  addCard: (type: CardType) => void;
  removeCard: (id: string) => void;
  updateCard: (id: string, updates: Partial<CardData>) => void;
  updateLayout: (newCards: CardData[]) => void;
  selectCard: (id: string | null) => void;
  clearAll: () => void;
  setLayoutConfig: (config: Partial<LayoutConfig>) => void;
  undo: () => void;
  redo: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const deepCloneCards = (cards: CardData[]): CardData[] => {
  return cards.map(card => ({
    ...card,
    links: card.links ? card.links.map(link => ({ ...link })) : undefined
  }));
};

const getCardDefaults = (type: CardType, y: number): Partial<CardData> => {
  const base = { x: 0, y, w: 4, h: 3 };
  switch (type) {
    case 'project':
      return { ...base, type, title: '项目标题', description: '项目描述...' };
    case 'text':
      return { ...base, type, content: '在这里输入文本内容...', h: 2 };
    case 'contact':
      return {
        ...base,
        type,
        title: '联系方式',
        links: [
          { id: generateId(), type: 'github', url: 'https://github.com' }
        ],
        h: 2
      };
    default:
      return base;
  }
};

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  cards: [],
  selectedCardId: null,
  layoutConfig: {
    cols: 12,
    rowHeight: 60,
    width: 800
  },
  nextY: 0,
  history: [],
  redoStack: [],

  addCard: (type: CardType) => {
    const { cards, nextY, history } = get();
    const snapshot = deepCloneCards(cards);
    const newHistory = [...history, snapshot].slice(-MAX_HISTORY);

    const defaults = getCardDefaults(type, nextY);
    const newCard: CardData = {
      id: generateId(),
      ...defaults
    } as CardData;

    const newNextY = nextY + (defaults.h || 3);
    set({
      cards: [...cards, newCard],
      nextY: newNextY,
      selectedCardId: newCard.id,
      history: newHistory,
      redoStack: []
    });
  },

  removeCard: (id: string) => {
    const { cards, selectedCardId, history } = get();
    const snapshot = deepCloneCards(cards);
    const newHistory = [...history, snapshot].slice(-MAX_HISTORY);

    set({
      cards: cards.filter(card => card.id !== id),
      selectedCardId: selectedCardId === id ? null : selectedCardId,
      history: newHistory,
      redoStack: []
    });
  },

  updateCard: (id: string, updates: Partial<CardData>) => {
    const { cards, history } = get();
    const snapshot = deepCloneCards(cards);
    const newHistory = [...history, snapshot].slice(-MAX_HISTORY);

    set({
      cards: cards.map(card =>
        card.id === id ? { ...card, ...updates } : card
      ),
      history: newHistory,
      redoStack: []
    });
  },

  updateLayout: (newCards: CardData[]) => {
    const { cards, history } = get();

    const changed =
      cards.length !== newCards.length ||
      cards.some((c, i) => {
        const n = newCards[i];
        return !n || c.x !== n.x || c.y !== n.y || c.w !== n.w || c.h !== n.h || c.id !== n.id;
      });

    if (!changed) return;

    const snapshot = deepCloneCards(cards);
    const newHistory = [...history, snapshot].slice(-MAX_HISTORY);
    const maxY = Math.max(...newCards.map(c => c.y + c.h), 0);

    set({
      cards: newCards,
      nextY: maxY,
      history: newHistory,
      redoStack: []
    });
  },

  selectCard: (id: string | null) => {
    set({ selectedCardId: id });
  },

  clearAll: () => {
    const { cards, history } = get();
    if (cards.length === 0) return;

    const snapshot = deepCloneCards(cards);
    const newHistory = [...history, snapshot].slice(-MAX_HISTORY);

    set({
      cards: [],
      selectedCardId: null,
      nextY: 0,
      history: newHistory,
      redoStack: []
    });
  },

  setLayoutConfig: (config: Partial<LayoutConfig>) => {
    const { layoutConfig } = get();
    set({ layoutConfig: { ...layoutConfig, ...config } });
  },

  undo: () => {
    const { cards, history, redoStack } = get();
    if (history.length === 0) return;

    const previousState = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const currentSnapshot = deepCloneCards(cards);

    const maxY = Math.max(...previousState.map(c => c.y + c.h), 0);

    set({
      cards: previousState,
      nextY: maxY,
      selectedCardId: null,
      history: newHistory,
      redoStack: [...redoStack, currentSnapshot]
    });
  },

  redo: () => {
    const { cards, history, redoStack } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const currentSnapshot = deepCloneCards(cards);

    const maxY = Math.max(...nextState.map(c => c.y + c.h), 0);

    set({
      cards: nextState,
      nextY: maxY,
      selectedCardId: null,
      history: [...history, currentSnapshot].slice(-MAX_HISTORY),
      redoStack: newRedoStack
    });
  }
}));
