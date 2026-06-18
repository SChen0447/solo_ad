import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  BoardElement,
  ToolType,
  User,
  HistoryAction,
  StickyElement,
  RectangleElement,
  CircleElement,
  LineElement,
  PenElement,
} from '../types';

const MAX_HISTORY = 50;

const COLORS = ['#ffffff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#fd79a8'];
const STROKE_WIDTHS = [2, 4, 6, 8];

const AVATAR_COLORS = ['#4a90d9', '#d94a4a', '#4ad94a', '#d9a44a', '#a44ad9', '#4ad9c9', '#d94a99', '#99d94a'];
const MOCK_NAMES = ['张三', '李四', '王五', '赵六', '陈七', '周八', '吴九', '郑十'];

interface BoardState {
  elements: BoardElement[];
  selectedId: string | null;
  currentTool: ToolType;
  currentColor: string;
  strokeWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  users: User[];
  currentUserId: string;
  isSyncing: boolean;
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
  isExporting: boolean;
  exportProgress: number;
  colors: string[];
  strokeWidths: number[];
  deletingId: string | null;

  addElement: (element: BoardElement, pushHistory?: boolean) => void;
  updateElement: (id: string, updates: Partial<BoardElement>, pushHistory?: boolean) => void;
  deleteElement: (id: string, pushHistory?: boolean) => void;
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  selectElement: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  createStickyNote: (x: number, y: number) => void;
  startExport: () => void;
  setExportProgress: (progress: number) => void;
  finishExport: () => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  syncRemoteAdd: (element: BoardElement) => void;
  syncRemoteUpdate: (id: string, updates: Partial<BoardElement>) => void;
  syncRemoteDelete: (id: string) => void;
  getElementBounds: (element: BoardElement) => { x: number; y: number; width: number; height: number };
}

const generateMockUser = (): User => {
  const id = uuidv4();
  const idx = Math.floor(Math.random() * MOCK_NAMES.length);
  return {
    id,
    name: MOCK_NAMES[idx],
    color: AVATAR_COLORS[idx],
    avatar: MOCK_NAMES[idx][0],
  };
};

const currentUser = generateMockUser();

const mockOtherUsers: User[] = [
  { id: uuidv4(), name: '李四', color: '#d94a4a', avatar: '李' },
  { id: uuidv4(), name: '王五', color: '#4ad94a', avatar: '王' },
];

export const useBoardStore = create<BoardState>((set, get) => ({
  elements: [],
  selectedId: null,
  currentTool: 'select',
  currentColor: COLORS[0],
  strokeWidth: STROKE_WIDTHS[1],
  zoom: 1,
  pan: { x: 0, y: 0 },
  users: [currentUser, ...mockOtherUsers],
  currentUserId: currentUser.id,
  isSyncing: false,
  undoStack: [],
  redoStack: [],
  isExporting: false,
  exportProgress: 0,
  colors: COLORS,
  strokeWidths: STROKE_WIDTHS,
  deletingId: null,

  addElement: (element, pushHistory = true) => {
    set((state) => {
      const newUndoStack = pushHistory
        ? [...state.undoStack, { type: 'add', element } as HistoryAction].slice(-MAX_HISTORY)
        : state.undoStack;
      return {
        elements: [...state.elements, element],
        undoStack: newUndoStack,
        redoStack: pushHistory ? [] : state.redoStack,
      };
    });
  },

  updateElement: (id, updates, pushHistory = true) => {
    set((state) => {
      const element = state.elements.find((e) => e.id === id);
      if (!element) return state;

      const before: Partial<BoardElement> = {};
      (Object.keys(updates) as (keyof BoardElement)[]).forEach((key) => {
        (before as Record<string, unknown>)[key] = element[key];
      });

      const newUndoStack = pushHistory
        ? [...state.undoStack, { type: 'update', id, before, after: updates } as HistoryAction].slice(-MAX_HISTORY)
        : state.undoStack;

      return {
        elements: state.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        undoStack: newUndoStack,
        redoStack: pushHistory ? [] : state.redoStack,
      };
    });
  },

  deleteElement: (id, pushHistory = true) => {
    set((state) => {
      const element = state.elements.find((e) => e.id === id);
      if (!element) return state;

      const newUndoStack = pushHistory
        ? [...state.undoStack, { type: 'delete', element } as HistoryAction].slice(-MAX_HISTORY)
        : state.undoStack;

      return {
        elements: state.elements.filter((e) => e.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        undoStack: newUndoStack,
        redoStack: pushHistory ? [] : state.redoStack,
        deletingId: id,
      };
    });

    setTimeout(() => {
      set({ deletingId: null });
    }, 200);
  },

  setTool: (tool) => set({ currentTool: tool, selectedId: null }),
  setColor: (color) => set({ currentColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(3, zoom)) }),
  setPan: (pan) => set({ pan }),
  selectElement: (id) => set({ selectedId: id }),

  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return state;

      const action = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);
      const newRedoStack = [...state.redoStack, action];

      let newElements = [...state.elements];
      let newSelectedId = state.selectedId;

      if (action.type === 'add') {
        newElements = newElements.filter((e) => e.id !== action.element.id);
        if (newSelectedId === action.element.id) newSelectedId = null;
      } else if (action.type === 'update') {
        newElements = newElements.map((e) =>
          e.id === action.id ? { ...e, ...action.before } : e
        );
      } else if (action.type === 'delete') {
        newElements = [...newElements, action.element];
      }

      return {
        elements: newElements,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        selectedId: newSelectedId,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return state;

      const action = state.redoStack[state.redoStack.length - 1];
      const newRedoStack = state.redoStack.slice(0, -1);
      const newUndoStack = [...state.undoStack, action];

      let newElements = [...state.elements];
      let newSelectedId = state.selectedId;

      if (action.type === 'add') {
        newElements = [...newElements, action.element];
      } else if (action.type === 'update') {
        newElements = newElements.map((e) =>
          e.id === action.id ? { ...e, ...action.after } : e
        );
      } else if (action.type === 'delete') {
        newElements = newElements.filter((e) => e.id !== action.element.id);
        if (newSelectedId === action.element.id) newSelectedId = null;
      }

      return {
        elements: newElements,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        selectedId: newSelectedId,
      };
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  createStickyNote: (x, y) => {
    const state = get();
    const sticky: StickyElement = {
      id: uuidv4(),
      type: 'sticky',
      x,
      y,
      width: 200,
      height: 150,
      color: '#FFF9C4',
      strokeWidth: 0,
      createdAt: Date.now(),
      userId: state.currentUserId,
      opacity: 1,
      text: '',
      isAnimating: true,
      animationStart: Date.now(),
    };
    state.addElement(sticky);
    state.selectElement(sticky.id);
  },

  startExport: () => set({ isExporting: true, exportProgress: 0 }),
  setExportProgress: (progress) => set({ exportProgress: progress }),
  finishExport: () => set({ isExporting: false, exportProgress: 0 }),

  addUser: (user) =>
    set((state) => ({
      users: state.users.find((u) => u.id === user.id) ? state.users : [...state.users, user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
    })),

  syncRemoteAdd: (element) => {
    set((state) => {
      if (state.elements.find((e) => e.id === element.id)) return state;
      return {
        elements: [...state.elements, { ...element, isAnimating: true, animationStart: Date.now() }],
      };
    });
  },

  syncRemoteUpdate: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }));
  },

  syncRemoteDelete: (id) => {
    set((state) => ({
      elements: state.elements.filter((e) => e.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  getElementBounds: (element) => {
    switch (element.type) {
      case 'rectangle':
      case 'sticky': {
        const el = element as RectangleElement | StickyElement;
        return {
          x: Math.min(el.x, el.x + el.width),
          y: Math.min(el.y, el.y + el.height),
          width: Math.abs(el.width),
          height: Math.abs(el.height),
        };
      }
      case 'circle': {
        const el = element as CircleElement;
        return {
          x: el.x - el.radiusX,
          y: el.y - el.radiusY,
          width: el.radiusX * 2,
          height: el.radiusY * 2,
        };
      }
      case 'line': {
        const el = element as LineElement;
        return {
          x: Math.min(el.x, el.x2),
          y: Math.min(el.y, el.y2),
          width: Math.abs(el.x2 - el.x),
          height: Math.abs(el.y2 - el.y),
        };
      }
      case 'pen': {
        const el = element as PenElement;
        if (el.points.length === 0) return { x: el.x, y: el.y, width: 0, height: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        el.points.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      }
    }
  },
}));
