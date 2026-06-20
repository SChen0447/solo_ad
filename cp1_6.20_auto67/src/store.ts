import { create } from 'zustand';
import type { Shape, ToolType, ModeType, UserCursor, MindMapData } from './types';

interface WhiteboardState {
  shapes: Shape[];
  selectedId: string | null;
  tool: ToolType;
  color: string;
  strokeWidth: number;
  mode: ModeType;
  history: Shape[][];
  historyIndex: number;
  onlineUsers: UserCursor[];
  remoteSelections: Record<string, { shapeId: string; color: string }>;
  mindMapData: MindMapData | null;
  mindMapTransition: boolean;

  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setMode: (mode: ModeType) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  selectShape: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  setOnlineUsers: (users: UserCursor[]) => void;
  setRemoteSelection: (userId: string, shapeId: string | null, color: string) => void;
  setMindMapData: (data: MindMapData | null) => void;
  setMindMapTransition: (v: boolean) => void;
  loadShapes: (shapes: Shape[]) => void;
}

const MAX_HISTORY = 50;

export const useStore = create<WhiteboardState>((set, get) => ({
  shapes: [],
  selectedId: null,
  tool: 'select',
  color: '#4a90d9',
  strokeWidth: 2,
  mode: 'canvas',
  history: [[]],
  historyIndex: 0,
  onlineUsers: [],
  remoteSelections: {},
  mindMapData: null,
  mindMapTransition: false,

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setMode: (mode) => set({ mode }),

  pushHistory: () => {
    const { shapes, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(shapes)));
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  addShape: (shape) => {
    const { shapes, pushHistory } = get();
    pushHistory();
    set({ shapes: [...shapes, shape] });
  },

  updateShape: (id, updates) => {
    const { shapes } = get();
    set({
      shapes: shapes.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    });
  },

  deleteShape: (id) => {
    const { shapes, pushHistory } = get();
    pushHistory();
    set({ shapes: shapes.filter((s) => s.id !== id), selectedId: null });
  },

  selectShape: (id) => set({ selectedId: id }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        historyIndex: newIndex,
        shapes: JSON.parse(JSON.stringify(history[newIndex])),
        selectedId: null,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        historyIndex: newIndex,
        shapes: JSON.parse(JSON.stringify(history[newIndex])),
        selectedId: null,
      });
    }
  },

  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  setRemoteSelection: (userId, shapeId, color) => {
    const { remoteSelections } = get();
    const updated = { ...remoteSelections };
    if (shapeId) {
      updated[userId] = { shapeId, color };
    } else {
      delete updated[userId];
    }
    set({ remoteSelections: updated });
  },

  setMindMapData: (mindMapData) => set({ mindMapData }),
  setMindMapTransition: (mindMapTransition) => set({ mindMapTransition }),

  loadShapes: (shapes) => {
    set({ shapes, history: [JSON.parse(JSON.stringify(shapes))], historyIndex: 0 });
  },
}));
