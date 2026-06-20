import { create } from 'zustand';
import { CardTemplate, TextElement, DecorationElement, BackgroundConfig, PageType, CardElement } from './types';
import { templates } from './data/templates';

interface CardStore {
  currentPage: PageType;
  selectedTemplate: CardTemplate | null;
  texts: TextElement[];
  decorations: DecorationElement[];
  background: BackgroundConfig;
  selectedElementId: string | null;
  previewCanvasData: string | null;
  shareLink: string;

  setPage: (page: PageType) => void;
  selectTemplate: (template: CardTemplate) => void;
  resetToTemplate: (template: CardTemplate) => void;
  addText: (text: TextElement) => void;
  updateText: (id: string, updates: Partial<TextElement>) => void;
  addDecoration: (deco: DecorationElement) => void;
  updateDecoration: (id: string, updates: Partial<DecorationElement>) => void;
  removeElement: (id: string) => void;
  setBackground: (bg: BackgroundConfig) => void;
  setSelectedElement: (id: string | null) => void;
  setPreviewCanvasData: (data: string | null) => void;
  setShareLink: (link: string) => void;
  goBack: () => void;
  getAllElements: () => CardElement[];
}

const defaultBg: BackgroundConfig = { type: 'solid', value: '#FFF8F0' };

export const useCardStore = create<CardStore>((set, get) => ({
  currentPage: 'home',
  selectedTemplate: null,
  texts: [],
  decorations: [],
  background: defaultBg,
  selectedElementId: null,
  previewCanvasData: null,
  shareLink: '',

  setPage: (page) => set({ currentPage: page }),

  selectTemplate: (template) => {
    set({
      selectedTemplate: template,
      texts: [...template.defaultTexts],
      decorations: [...template.defaultDecorations],
      background: template.background,
      selectedElementId: null,
      currentPage: 'editor',
    });
  },

  resetToTemplate: (template) => {
    set({
      texts: [...template.defaultTexts],
      decorations: [...template.defaultDecorations],
      background: template.background,
      selectedElementId: null,
    });
  },

  addText: (text) => {
    set((state) => ({
      texts: [...state.texts, text],
      selectedElementId: text.id,
    }));
  },

  updateText: (id, updates) => {
    set((state) => ({
      texts: state.texts.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  addDecoration: (deco) => {
    set((state) => ({
      decorations: [...state.decorations, deco],
      selectedElementId: deco.id,
    }));
  },

  updateDecoration: (id, updates) => {
    set((state) => ({
      decorations: state.decorations.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
  },

  removeElement: (id) => {
    set((state) => ({
      texts: state.texts.filter((t) => t.id !== id),
      decorations: state.decorations.filter((d) => d.id !== id),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    }));
  },

  setBackground: (bg) => set({ background: bg }),

  setSelectedElement: (id) => set({ selectedElementId: id }),

  setPreviewCanvasData: (data) => set({ previewCanvasData: data }),

  setShareLink: (link) => set({ shareLink: link }),

  goBack: () => {
    const state = get();
    if (state.currentPage === 'preview') {
      set({ currentPage: 'editor' });
    } else if (state.currentPage === 'editor') {
      set({
        currentPage: 'home',
        selectedTemplate: null,
        texts: [],
        decorations: [],
        background: defaultBg,
        selectedElementId: null,
        previewCanvasData: null,
        shareLink: '',
      });
    }
  },

  getAllElements: () => {
    const state = get();
    return [...state.texts, ...state.decorations] as CardElement[];
  },
}));

export type { CardStore };
