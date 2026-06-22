import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, CanvasState, HistorySnapshot } from '@/types';
import {
  createStickyElement,
  createRectangleElement,
  createPathElement,
} from '@/types';
import {
  pushHistory,
  undo as historyUndo,
  redo as historyRedo,
  canUndo,
  canRedo,
  getRecentActions,
  type HistoryState,
} from '@/CollaborationModule/HistoryManager';

interface WhiteboardStore extends CanvasState {
  historyState: HistoryState;

  addSticky: (x: number, y: number) => void;
  addRectangle: (x: number, y: number) => void;
  addPath: (points: { x: number; y: number }[]) => void;
  deleteElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  setSelectedId: (id: string | null) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  setTool: (tool: CanvasState['tool']) => void;
  setDragging: (dragging: boolean) => void;
  setDrawing: (drawing: boolean) => void;
  undo: () => void;
  redo: () => void;
  toggleSidebar: () => void;
  getCanUndo: () => boolean;
  getCanRedo: () => boolean;
  getRecentHistory: (count?: number) => HistorySnapshot[];
  setElements: (elements: CanvasElement[]) => void;
}

export const useWhiteboardStore = create<WhiteboardStore>((set, get) => ({
  elements: [],
  offset: { x: 0, y: 0 },
  zoom: 1,
  selectedId: null,
  dragging: false,
  drawing: false,
  tool: 'select',
  historyState: { past: [], present: [], future: [] },
  sidebarOpen: false,

  addSticky: (x, y) => {
    const state = get();
    const el = createStickyElement(uuidv4(), x, y);
    const newElements = [...state.elements, el];
    const newHistoryState = pushHistory(state.historyState, 'add', newElements);
    set({ elements: newElements, historyState: newHistoryState });
  },

  addRectangle: (x, y) => {
    const state = get();
    const el = createRectangleElement(uuidv4(), x, y);
    const newElements = [...state.elements, el];
    const newHistoryState = pushHistory(state.historyState, 'add', newElements);
    set({ elements: newElements, historyState: newHistoryState });
  },

  addPath: (points) => {
    if (points.length < 2) return;
    const state = get();
    const el = createPathElement(uuidv4(), points);
    const newElements = [...state.elements, el];
    const newHistoryState = pushHistory(state.historyState, 'add', newElements);
    set({ elements: newElements, historyState: newHistoryState, drawing: false });
  },

  deleteElement: (id) => {
    const state = get();
    const newElements = state.elements.filter(e => e.id !== id);
    const newHistoryState = pushHistory(state.historyState, 'delete', newElements);
    set({ elements: newElements, historyState: newHistoryState, selectedId: null });
  },

  moveElement: (id, x, y) => {
    const state = get();
    const newElements = state.elements.map(e =>
      e.id === id ? { ...e, x, y } : e
    );
    set({ elements: newElements });
  },

  updateElement: (id, updates) => {
    const state = get();
    const newElements = state.elements.map(e =>
      e.id === id ? { ...e, ...updates } : e
    );
    const newHistoryState = pushHistory(state.historyState, 'edit', newElements);
    set({ elements: newElements, historyState: newHistoryState });
  },

  setSelectedId: (id) => set({ selectedId: id }),
  setOffset: (offset) => set({ offset }),
  setZoom: (zoom) => set({ zoom: Math.max(0.3, Math.min(3.0, zoom)) }),
  setTool: (tool) => set({ tool }),
  setDragging: (dragging) => set({ dragging }),
  setDrawing: (drawing) => set({ drawing }),

  undo: () => {
    const state = get();
    if (!canUndo(state.historyState)) return;
    const newHistoryState = historyUndo(state.historyState);
    set({ elements: newHistoryState.present, historyState: newHistoryState });
  },

  redo: () => {
    const state = get();
    if (!canRedo(state.historyState)) return;
    const newHistoryState = historyRedo(state.historyState);
    set({ elements: newHistoryState.present, historyState: newHistoryState });
  },

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  getCanUndo: () => canUndo(get().historyState),
  getCanRedo: () => canRedo(get().historyState),

  getRecentHistory: (count = 10) => getRecentActions(get().historyState, count),

  setElements: (elements) => {
    const state = get();
    const newHistoryState = pushHistory(state.historyState, 'edit', elements);
    set({ elements, historyState: newHistoryState });
  },
}));
