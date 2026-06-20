import { create } from 'zustand';
import type { CardElementUnion, TextElement, DecorationElement, BackgroundType } from '@/types';

interface CardState {
  elements: CardElementUnion[];
  background: string;
  backgroundType: BackgroundType;
  selectedElementId: string | null;
  templateId: string | null;

  addElement: (element: CardElementUnion) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<CardElementUnion>) => void;
  selectElement: (id: string | null) => void;
  setBackground: (bg: string, type: BackgroundType) => void;
  loadTemplate: (templateId: string, gradientColors: [string, string], defaultText: string) => void;
  clearCanvas: () => void;
  moveElement: (id: string, x: number, y: number) => void;
}

let idCounter = 0;
export function generateId(): string {
  idCounter += 1;
  return `el_${Date.now()}_${idCounter}`;
}

export const useCardStore = create<CardState>((set) => ({
  elements: [],
  background: '#FFF8F0',
  backgroundType: 'gradient',
  selectedElementId: null,
  templateId: null,

  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as CardElementUnion) : el
      ),
    })),

  selectElement: (id) => set({ selectedElementId: id }),

  setBackground: (bg, type) => set({ background: bg, backgroundType: type }),

  loadTemplate: (templateId, gradientColors, defaultText) => {
    const textId = generateId();
    const newText: TextElement = {
      id: textId,
      type: 'text',
      x: 400,
      y: 300,
      rotation: 0,
      scale: 1,
      text: defaultText,
      fontFamily: 'Quicksand',
      fontSize: 36,
      color: '#FFFFFF',
      strokeWidth: 2,
      strokeColor: '#333333',
      shadowBlur: 4,
      shadowColor: 'rgba(0,0,0,0.3)',
    };
    set({
      templateId,
      background: `${gradientColors[0]},${gradientColors[1]}`,
      backgroundType: 'gradient',
      elements: [newText],
      selectedElementId: null,
    });
  },

  clearCanvas: () =>
    set({
      elements: [],
      background: '#FFF8F0',
      backgroundType: 'gradient',
      selectedElementId: null,
      templateId: null,
    }),

  moveElement: (id, x, y) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, x, y } : el
      ),
    })),
}));
