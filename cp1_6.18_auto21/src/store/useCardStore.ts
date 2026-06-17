import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Card, Link, SearchFilter } from '../types';
import { generateMockCards, generateMockLinks } from '../utils/mockData';

interface CardState {
  cards: Card[];
  links: Link[];
  searchFilter: SearchFilter;
  isCaptureModalOpen: boolean;
  isGraphDrawerOpen: boolean;
  highlightedTag: string | null;
  highlightedCardIds: Set<string>;
  focusedCardId: string | null;
}

interface CardActions {
  addCard: (data: Partial<Card> & Pick<Card, 'title' | 'content' | 'tags'>) => void;
  updateCard: (id: string, data: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  moveCard: (id: string, x: number, y: number) => void;
  clearCardNewFlag: (id: string) => void;

  addLink: (sourceCardId: string, targetCardId: string, label?: string) => void;
  updateLinkLabel: (id: string, label: string) => void;
  deleteLink: (id: string) => void;

  setSearchFilter: (filter: Partial<SearchFilter>) => void;
  setIsCaptureModalOpen: (open: boolean) => void;
  setIsGraphDrawerOpen: (open: boolean) => void;
  setHighlightedTag: (tag: string | null) => void;
  setFocusedCardId: (id: string | null) => void;
  centerCardsByTag: (tag: string) => void;
}

const initialCards = generateMockCards(15);
const initialLinks = generateMockLinks(initialCards);

export const useCardStore = create<CardState & CardActions>((set, get) => ({
  cards: initialCards,
  links: initialLinks,
  searchFilter: {
    keyword: '',
    tags: [],
    dateFrom: null,
    dateTo: null,
  },
  isCaptureModalOpen: false,
  isGraphDrawerOpen: false,
  highlightedTag: null,
  highlightedCardIds: new Set(),
  focusedCardId: null,

  addCard: (data) => {
    const now = Date.now();
    const newCard: Card = {
      id: uuidv4(),
      title: data.title,
      content: data.content,
      url: data.url || '',
      summary: data.summary || data.content.slice(0, 50) + '...',
      tags: data.tags,
      x: data.x ?? 100 + Math.random() * 100,
      y: data.y ?? 100 + Math.random() * 100,
      createdAt: now,
      updatedAt: now,
      isNew: true,
    };
    set((state) => ({
      cards: [newCard, ...state.cards],
    }));
  },

  updateCard: (id, data) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c
      ),
    }));
  },

  deleteCard: (id) => {
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
      links: state.links.filter(
        (l) => l.sourceCardId !== id && l.targetCardId !== id
      ),
    }));
  },

  moveCard: (id, x, y) => {
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, x, y } : c)),
    }));
  },

  clearCardNewFlag: (id) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, isNew: false } : c
      ),
    }));
  },

  addLink: (sourceCardId, targetCardId, label = '') => {
    const { links } = get();
    const exists = links.some(
      (l) =>
        (l.sourceCardId === sourceCardId && l.targetCardId === targetCardId) ||
        (l.sourceCardId === targetCardId && l.targetCardId === sourceCardId)
    );
    if (exists || sourceCardId === targetCardId) return;

    const newLink: Link = {
      id: uuidv4(),
      sourceCardId,
      targetCardId,
      label,
    };
    set((state) => ({
      links: [...state.links, newLink],
    }));
  },

  updateLinkLabel: (id, label) => {
    set((state) => ({
      links: state.links.map((l) => (l.id === id ? { ...l, label } : l)),
    }));
  },

  deleteLink: (id) => {
    set((state) => ({
      links: state.links.filter((l) => l.id !== id),
    }));
  },

  setSearchFilter: (filter) => {
    set((state) => ({
      searchFilter: { ...state.searchFilter, ...filter },
    }));
  },

  setIsCaptureModalOpen: (open) => {
    set({ isCaptureModalOpen: open });
  },

  setIsGraphDrawerOpen: (open) => {
    set({ isGraphDrawerOpen: open });
  },

  setHighlightedTag: (tag) => {
    const { cards } = get();
    if (!tag) {
      set({
        highlightedTag: null,
        highlightedCardIds: new Set(),
      });
      return;
    }
    const ids = new Set(
      cards.filter((c) => c.tags.includes(tag)).map((c) => c.id)
    );
    set({
      highlightedTag: tag,
      highlightedCardIds: ids,
    });
  },

  setFocusedCardId: (id) => {
    set({ focusedCardId: id });
  },

  centerCardsByTag: (tag) => {
    const { cards } = get();
    const relatedCards = cards.filter((c) => c.tags.includes(tag));
    if (relatedCards.length === 0) return;

    const centerX = 400;
    const centerY = 300;
    const radius = 180;

    set((state) => ({
      cards: state.cards.map((card) => {
        if (!card.tags.includes(tag)) return card;
        const idx = relatedCards.findIndex((c) => c.id === card.id);
        const angle = (idx / relatedCards.length) * Math.PI * 2;
        return {
          ...card,
          x: centerX + Math.cos(angle) * radius - 140,
          y: centerY + Math.sin(angle) * radius - 80,
        };
      }),
    }));
  },
}));
