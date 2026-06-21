import { create } from 'zustand';
import type { CanvasElement, ToolType } from '../types';
import { MAX_HISTORY } from '../types';

interface CanvasState {
  elements: CanvasElement[];
  selectedId: string | null;
  editingId: string | null;
  activeTool: ToolType;
  zoom: number;
  offsetX: number;
  offsetY: number;
  past: CanvasElement[][];
  future: CanvasElement[][];

  setTool: (tool: ToolType) => void;
  addElement: (el: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  setView: (zoom: number, offsetX: number, offsetY: number) => void;
  setViewImmediate: (zoom: number, offsetX: number, offsetY: number) => void;
  undo: () => void;
  redo: () => void;
  snapshot: () => void;
}

const deepCloneElements = (arr: CanvasElement[]): CanvasElement[] =>
  JSON.parse(JSON.stringify(arr));

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  selectedId: null,
  editingId: null,
  activeTool: 'select',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  past: [],
  future: [],

  setTool: (tool) => set({ activeTool: tool, editingId: null }),

  snapshot: () => {
    const state = get();
    const newPast = [...state.past, deepCloneElements(state.elements)];
    if (newPast.length > MAX_HISTORY) {
      newPast.shift();
    }
    set({ past: newPast, future: [] });
  },

  addElement: (el) => {
    const state = get();
    const newPast = [...state.past, deepCloneElements(state.elements)];
    if (newPast.length > MAX_HISTORY) newPast.shift();
    set({
      elements: [...state.elements, el],
      past: newPast,
      future: [],
      selectedId: el.id,
    });
  },

  updateElement: (id, patch) => {
    const state = get();
    const newPast = [...state.past, deepCloneElements(state.elements)];
    if (newPast.length > MAX_HISTORY) newPast.shift();
    set({
      elements: state.elements.map((e) =>
        e.id === id ? ({ ...e, ...patch } as CanvasElement) : e
      ),
      past: newPast,
      future: [],
    });
  },

  deleteElement: (id) => {
    const state = get();
    const newPast = [...state.past, deepCloneElements(state.elements)];
    if (newPast.length > MAX_HISTORY) newPast.shift();
    set({
      elements: state.elements.filter((e) => e.id !== id),
      past: newPast,
      future: [],
      selectedId: state.selectedId === id ? null : state.selectedId,
    });
  },

  selectElement: (id) => set({ selectedId: id, editingId: null }),
  setEditing: (id) => set({ editingId: id }),

  setView: (zoom, offsetX, offsetY) => set({ zoom, offsetX, offsetY }),
  setViewImmediate: (zoom, offsetX, offsetY) => set({ zoom, offsetX, offsetY }),

  undo: () => {
    const state = get();
    if (state.past.length === 0) return;
    const newPast = [...state.past];
    const prev = newPast.pop()!;
    const newFuture = [deepCloneElements(state.elements), ...state.future];
    if (newFuture.length > MAX_HISTORY) newFuture.pop();
    set({ past: newPast, future: newFuture, elements: prev });
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0) return;
    const newFuture = [...state.future];
    const next = newFuture.shift()!;
    const newPast = [...state.past, deepCloneElements(state.elements)];
    if (newPast.length > MAX_HISTORY) newPast.shift();
    set({ past: newPast, future: newFuture, elements: next });
  },
}));
