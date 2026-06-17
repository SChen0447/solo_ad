import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Tag, ConnectionType, createCard, createConnection } from '@/model/CardModel';
import type { InspirationCard, Connection } from '@/model/CardModel';
import { storageEngine } from '@/model/StorageEngine';

interface MindState {
  cards: InspirationCard[];
  connections: Connection[];
  floatingNoteVisible: boolean;
  searchQuery: string;
  activeTags: Tag[];
  timelineStart: number;
  timelineEnd: number;
  connectingFrom: string | null;
  connectingTo: { x: number; y: number } | null;
  editingConnectionId: string | null;
  selectedCardId: string | null;

  loadFromStorage: () => void;
  addCard: (text: string) => void;
  updateCardPosition: (id: string, x: number, y: number) => void;
  updateCardContent: (id: string, updates: Partial<InspirationCard>) => void;
  deleteCard: (id: string) => void;
  addConnection: (sourceId: string, targetId: string, type?: ConnectionType, label?: string) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  setFloatingNoteVisible: (visible: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveTags: (tags: Tag[]) => void;
  toggleTag: (tag: Tag) => void;
  setTimelineRange: (start: number, end: number) => void;
  setConnectingFrom: (id: string | null) => void;
  setConnectingTo: (pos: { x: number; y: number } | null) => void;
  setEditingConnectionId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  getFilteredCards: () => InspirationCard[];
}

const findNextPosition = (cards: InspirationCard[]): { x: number; y: number } => {
  if (cards.length === 0) return { x: 100, y: 100 };
  const lastCard = cards[cards.length - 1];
  return {
    x: lastCard.x + 40,
    y: lastCard.y + 40,
  };
};

export const useMindStore = create<MindState>((set, get) => ({
  cards: [],
  connections: [],
  floatingNoteVisible: false,
  searchQuery: '',
  activeTags: [],
  timelineStart: 0,
  timelineEnd: Date.now(),
  connectingFrom: null,
  connectingTo: null,
  editingConnectionId: null,
  selectedCardId: null,

  loadFromStorage: () => {
    const cards = storageEngine.getCards();
    const connections = storageEngine.getConnections();
    const now = Date.now();
    const minTime = cards.length > 0 ? Math.min(...cards.map(c => c.createdAt)) : now;
    set({
      cards,
      connections,
      timelineStart: minTime,
      timelineEnd: now,
    });
  },

  addCard: (text: string) => {
    const id = uuidv4();
    const { cards } = get();
    const pos = findNextPosition(cards);
    const card = createCard(id, text, pos.x, pos.y);
    storageEngine.addCard(card);
    set({ cards: [...storageEngine.getCards()] });
  },

  updateCardPosition: (id: string, x: number, y: number) => {
    const { cards } = get();
    const updated = cards.map(c =>
      c.id === id ? { ...c, x, y, updatedAt: Date.now() } : c
    );
    set({ cards: updated });
    storageEngine.updateCard(id, { x, y });
  },

  updateCardContent: (id: string, updates: Partial<InspirationCard>) => {
    const { cards } = get();
    const updated = cards.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    set({ cards: updated });
    storageEngine.updateCard(id, updates);
  },

  deleteCard: (id: string) => {
    storageEngine.deleteCard(id);
    set({
      cards: storageEngine.getCards(),
      connections: storageEngine.getConnections(),
    });
  },

  addConnection: (sourceId: string, targetId: string, type?: ConnectionType, label?: string) => {
    const id = uuidv4();
    const connection = createConnection(id, sourceId, targetId, type, label);
    storageEngine.addConnection(connection);
    set({ connections: [...storageEngine.getConnections()] });
  },

  updateConnection: (id: string, updates: Partial<Connection>) => {
    storageEngine.updateConnection(id, updates);
    set({ connections: [...storageEngine.getConnections()] });
  },

  deleteConnection: (id: string) => {
    storageEngine.deleteConnection(id);
    set({ connections: [...storageEngine.getConnections()] });
  },

  setFloatingNoteVisible: (visible: boolean) => set({ floatingNoteVisible: visible }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setActiveTags: (tags: Tag[]) => set({ activeTags: tags }),

  toggleTag: (tag: Tag) => {
    const { activeTags } = get();
    const isActive = activeTags.includes(tag);
    set({
      activeTags: isActive
        ? activeTags.filter(t => t !== tag)
        : [...activeTags, tag],
    });
  },

  setTimelineRange: (start: number, end: number) => set({ timelineStart: start, timelineEnd: end }),

  setConnectingFrom: (id: string | null) => set({ connectingFrom: id }),
  setConnectingTo: (pos: { x: number; y: number } | null) => set({ connectingTo: pos }),
  setEditingConnectionId: (id: string | null) => set({ editingConnectionId: id }),
  setSelectedCardId: (id: string | null) => set({ selectedCardId: id }),

  getFilteredCards: () => {
    const { cards, searchQuery, activeTags, timelineStart, timelineEnd } = get();
    return cards.filter(card => {
      if (card.createdAt < timelineStart || card.createdAt > timelineEnd) return false;
      if (activeTags.length > 0 && !activeTags.some(t => card.tags.includes(t))) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = card.title.toLowerCase().includes(q);
        const matchContent = card.content.toLowerCase().includes(q);
        const matchTags = card.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchContent && !matchTags) return false;
      }
      return true;
    });
  },
}));
