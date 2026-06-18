import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ScrapedData } from '../scraper/scraper';

export interface CardData extends ScrapedData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
  isFavorite: boolean;
  isOnBoard: boolean;
  rotation: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  createdAt: number;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

interface BoardState {
  cards: CardData[];
  connections: Connection[];
  viewport: Viewport;
  selectedCardId: string | null;
  selectedConnectionId: string | null;
  connectingFromId: string | null;
  sidebarCards: CardData[];

  addSidebarCard: (data: ScrapedData) => void;
  removeSidebarCard: (id: string) => void;
  toggleFavorite: (id: string) => void;

  addCardToBoard: (id: string, x: number, y: number) => void;
  removeCardFromBoard: (id: string) => void;
  updateCardPosition: (id: string, x: number, y: number) => void;

  startConnection: (cardId: string) => void;
  completeConnection: (cardId: string) => void;
  cancelConnection: () => void;
  setConnectionLabel: (id: string, label: string) => void;
  removeConnection: (id: string) => void;

  setViewport: (viewport: Viewport) => void;
  setSelectedCard: (id: string | null) => void;
  setSelectedConnection: (id: string | null) => void;

  getAllBoardColors: () => string[];
}

const INITIAL_SIDEBAR_CARDS: CardData[] = [
  {
    id: uuidv4(),
    title: '极简主义设计灵感',
    summary: '探索极简设计的核心原则和优秀案例，帮助你创造更有力量的视觉作品。',
    thumbnail: 'https://picsum.photos/seed/minimal/400/300',
    colors: ['#2c3e50', '#ecf0f1', '#3498db'],
    x: 0,
    y: 0,
    width: 280,
    height: 200,
    createdAt: Date.now() - 3600000,
    isFavorite: true,
    isOnBoard: false,
    rotation: 0,
  },
  {
    id: uuidv4(),
    title: '色彩搭配指南',
    summary: '专业配色方案大全，从互补色到类似色，掌握色彩搭配的黄金法则。',
    thumbnail: 'https://picsum.photos/seed/colors/400/300',
    colors: ['#e74c3c', '#f39c12', '#27ae60'],
    x: 0,
    y: 0,
    width: 280,
    height: 200,
    createdAt: Date.now() - 7200000,
    isFavorite: false,
    isOnBoard: false,
    rotation: 0,
  },
  {
    id: uuidv4(),
    title: 'UI设计趋势2024',
    summary: '今年最流行的界面设计趋势，玻璃拟态、新拟态、3D元素等前沿风格。',
    thumbnail: 'https://picsum.photos/seed/uiux/400/300',
    colors: ['#9b59b6', '#3498db', '#1abc9c'],
    x: 0,
    y: 0,
    width: 280,
    height: 200,
    createdAt: Date.now() - 10800000,
    isFavorite: false,
    isOnBoard: false,
    rotation: 0,
  },
  {
    id: uuidv4(),
    title: '品牌设计案例集',
    summary: '精选全球顶级品牌视觉识别系统设计案例，启发你的品牌创作灵感。',
    thumbnail: 'https://picsum.photos/seed/branding/400/300',
    colors: ['#e67e22', '#d35400', '#f1c40f'],
    x: 0,
    y: 0,
    width: 280,
    height: 200,
    createdAt: Date.now() - 14400000,
    isFavorite: true,
    isOnBoard: false,
    rotation: 0,
  },
  {
    id: uuidv4(),
    title: '动效设计基础',
    summary: '从零开始学习动效设计，掌握缓动函数、时间轴和交互动效的核心技巧。',
    thumbnail: 'https://picsum.photos/seed/motion/400/300',
    colors: ['#6c63ff', '#4e46c9', '#a8a2ff'],
    x: 0,
    y: 0,
    width: 280,
    height: 200,
    createdAt: Date.now() - 18000000,
    isFavorite: false,
    isOnBoard: false,
    rotation: 0,
  },
];

export const useBoardStore = create<BoardState>((set, get) => ({
  cards: [],
  connections: [],
  viewport: { x: 0, y: 0, scale: 1 },
  selectedCardId: null,
  selectedConnectionId: null,
  connectingFromId: null,
  sidebarCards: INITIAL_SIDEBAR_CARDS,

  addSidebarCard: (data: ScrapedData) => {
    const newCard: CardData = {
      id: uuidv4(),
      ...data,
      x: 0,
      y: 0,
      width: 280,
      height: 200,
      createdAt: Date.now(),
      isFavorite: false,
      isOnBoard: false,
      rotation: 0,
    };
    set((state) => ({
      sidebarCards: [newCard, ...state.sidebarCards],
    }));
  },

  removeSidebarCard: (id: string) => {
    set((state) => ({
      sidebarCards: state.sidebarCards.filter((c) => c.id !== id),
    }));
  },

  toggleFavorite: (id: string) => {
    set((state) => ({
      sidebarCards: state.sidebarCards.map((c) =>
        c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
      ),
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
      ),
    }));
  },

  addCardToBoard: (id: string, x: number, y: number) => {
    const { sidebarCards, cards } = get();
    const sidebarCard = sidebarCards.find((c) => c.id === id);
    const existingCard = cards.find((c) => c.id === id);

    if (existingCard) return;

    if (sidebarCard) {
      const boardCard: CardData = {
        ...sidebarCard,
        x,
        y,
        isOnBoard: true,
      };
      set((state) => ({
        cards: [...state.cards, boardCard],
      }));
    }
  },

  removeCardFromBoard: (id: string) => {
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
      connections: state.connections.filter(
        (c) => c.fromId !== id && c.toId !== id
      ),
      selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
    }));
  },

  updateCardPosition: (id: string, x: number, y: number) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, x, y } : c
      ),
    }));
  },

  startConnection: (cardId: string) => {
    set({ connectingFromId: cardId });
  },

  completeConnection: (cardId: string) => {
    const { connectingFromId, connections } = get();
    if (!connectingFromId || connectingFromId === cardId) {
      set({ connectingFromId: null });
      return;
    }

    const exists = connections.some(
      (c) =>
        (c.fromId === connectingFromId && c.toId === cardId) ||
        (c.fromId === cardId && c.toId === connectingFromId)
    );

    if (exists) {
      set({ connectingFromId: null });
      return;
    }

    const newConnection: Connection = {
      id: uuidv4(),
      fromId: connectingFromId,
      toId: cardId,
      label: '',
      createdAt: Date.now(),
    };

    set((state) => ({
      connections: [...state.connections, newConnection],
      connectingFromId: null,
    }));
  },

  cancelConnection: () => {
    set({ connectingFromId: null });
  },

  setConnectionLabel: (id: string, label: string) => {
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, label } : c
      ),
    }));
  },

  removeConnection: (id: string) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      selectedConnectionId:
        state.selectedConnectionId === id ? null : state.selectedConnectionId,
    }));
  },

  setViewport: (viewport: Viewport) => {
    set({ viewport });
  },

  setSelectedCard: (id: string | null) => {
    set({ selectedCardId: id });
  },

  setSelectedConnection: (id: string | null) => {
    set({ selectedConnectionId: id });
  },

  getAllBoardColors: () => {
    const { cards } = get();
    const colorCount: Map<string, number> = new Map();

    cards.forEach((card) => {
      card.colors.forEach((color, index) => {
        const weight = 3 - index;
        colorCount.set(
          color,
          (colorCount.get(color) || 0) + weight
        );
      });
    });

    return Array.from(colorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color);
  },
}));
