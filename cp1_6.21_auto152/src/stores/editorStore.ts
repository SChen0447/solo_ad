import { create } from 'zustand';
import type { TemplateConfig, AlignType } from '../templates/templateConfig';
import { templateList, getTemplateById, cloneTemplate } from '../templates/templateConfig';

const MAX_HISTORY = 50;

interface EditorState {
  selectedTemplateId: string;
  currentTemplate: TemplateConfig;
  history: TemplateConfig[];
  historyIndex: number;
  previewVisible: Record<string, boolean>;
  setSelectedTemplate: (id: string) => void;
  setTitle: (title: string) => void;
  setSubtitle: (subtitle: string) => void;
  setButtonText: (text: string) => void;
  setButtonLink: (link: string) => void;
  setButtonBgColor: (color: string) => void;
  setButtonTextColor: (color: string) => void;
  setGradientStart: (color: string) => void;
  setGradientEnd: (color: string) => void;
  setTextColor: (color: string) => void;
  setAlign: (align: AlignType) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setZIndex: (zIndex: number) => void;
  setCouponCode: (code: string) => void;
  setCountdownEndTime: (time: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  togglePreview: (key: string) => void;
  _pushHistory: (template: TemplateConfig) => void;
}

const initialTemplate = cloneTemplate(templateList[0]);

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedTemplateId: templateList[0].id,
  currentTemplate: initialTemplate,
  history: [initialTemplate],
  historyIndex: 0,
  previewVisible: {
    'mobile-1': true,
    'mobile-2': true,
    'desktop-1': true,
    'desktop-2': true
  },
  canUndo: false,
  canRedo: false,

  _pushHistory: (template: TemplateConfig) => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(cloneTemplate(template));
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false
    });
  },

  setSelectedTemplate: (id: string) => {
    const template = getTemplateById(id);
    if (template) {
      const cloned = cloneTemplate(template);
      set({
        selectedTemplateId: id,
        currentTemplate: cloned,
        history: [cloned],
        historyIndex: 0,
        canUndo: false,
        canRedo: false
      });
    }
  },

  setTitle: (title: string) => {
    const state = get();
    const updated = { ...state.currentTemplate, title };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setSubtitle: (subtitle: string) => {
    const state = get();
    const updated = { ...state.currentTemplate, subtitle };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setButtonText: (text: string) => {
    const state = get();
    const updated = {
      ...state.currentTemplate,
      button: { ...state.currentTemplate.button, text }
    };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setButtonLink: (link: string) => {
    const state = get();
    const updated = {
      ...state.currentTemplate,
      button: { ...state.currentTemplate.button, link }
    };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setButtonBgColor: (color: string) => {
    const state = get();
    const updated = {
      ...state.currentTemplate,
      button: { ...state.currentTemplate.button, bgColor: color }
    };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setButtonTextColor: (color: string) => {
    const state = get();
    const updated = {
      ...state.currentTemplate,
      button: { ...state.currentTemplate.button, textColor: color }
    };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setGradientStart: (color: string) => {
    const state = get();
    const updated = { ...state.currentTemplate, gradientStart: color };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setGradientEnd: (color: string) => {
    const state = get();
    const updated = { ...state.currentTemplate, gradientEnd: color };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setTextColor: (color: string) => {
    const state = get();
    const updated = { ...state.currentTemplate, textColor: color };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setAlign: (align: AlignType) => {
    const state = get();
    const updated = { ...state.currentTemplate, align };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setWidth: (width: number) => {
    const state = get();
    const updated = { ...state.currentTemplate, width };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setHeight: (height: number) => {
    const state = get();
    const updated = { ...state.currentTemplate, height };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setZIndex: (zIndex: number) => {
    const state = get();
    const updated = { ...state.currentTemplate, zIndex };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setCouponCode: (code: string) => {
    const state = get();
    const updated = { ...state.currentTemplate, couponCode: code };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  setCountdownEndTime: (time: string) => {
    const state = get();
    const updated = { ...state.currentTemplate, countdownEndTime: time };
    set({ currentTemplate: updated });
    get()._pushHistory(updated);
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        currentTemplate: cloneTemplate(state.history[newIndex]),
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        currentTemplate: cloneTemplate(state.history[newIndex]),
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < state.history.length - 1
      });
    }
  },

  togglePreview: (key: string) => {
    const state = get();
    set({
      previewVisible: {
        ...state.previewVisible,
        [key]: !state.previewVisible[key]
      }
    });
  }
}));
