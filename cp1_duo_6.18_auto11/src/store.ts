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

interface PortfolioStore {
  cards: CardData[];
  selectedCardId: string | null;
  layoutConfig: LayoutConfig;
  nextY: number;
  addCard: (type: CardType) => void;
  removeCard: (id: string) => void;
  updateCard: (id: string, updates: Partial<CardData>) => void;
  updateLayout: (newCards: CardData[]) => void;
  selectCard: (id: string | null) => void;
  clearAll: () => void;
  setLayoutConfig: (config: Partial<LayoutConfig>) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

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

  addCard: (type: CardType) => {
    const { cards, nextY } = get();
    const defaults = getCardDefaults(type, nextY);
    const newCard: CardData = {
      id: generateId(),
      ...defaults
    } as CardData;
    
    const newNextY = nextY + (defaults.h || 3);
    set({ cards: [...cards, newCard], nextY: newNextY, selectedCardId: newCard.id });
  },

  removeCard: (id: string) => {
    const { cards, selectedCardId } = get();
    set({
      cards: cards.filter(card => card.id !== id),
      selectedCardId: selectedCardId === id ? null : selectedCardId
    });
  },

  updateCard: (id: string, updates: Partial<CardData>) => {
    const { cards } = get();
    set({
      cards: cards.map(card =>
        card.id === id ? { ...card, ...updates } : card
      )
    });
  },

  updateLayout: (newCards: CardData[]) => {
    const maxY = Math.max(...newCards.map(c => c.y + c.h), 0);
    set({ cards: newCards, nextY: maxY });
  },

  selectCard: (id: string | null) => {
    set({ selectedCardId: id });
  },

  clearAll: () => {
    set({ cards: [], selectedCardId: null, nextY: 0 });
  },

  setLayoutConfig: (config: Partial<LayoutConfig>) => {
    const { layoutConfig } = get();
    set({ layoutConfig: { ...layoutConfig, ...config } });
  }
}));
