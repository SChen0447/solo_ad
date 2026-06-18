import { create } from 'zustand';
import type { User, CanvasElement, ToolType, Viewport, Point, DrawElement, StickyNoteElement, ImageElement } from './types';
import { wsManager } from './websocket';

interface CanvasState {
  currentUser: User | null;
  users: User[];
  elements: CanvasElement[];
  viewport: Viewport;
  currentTool: ToolType;
  brushColor: string;
  brushThickness: number;
  isConnected: boolean;
  isPanning: boolean;
  activeStickyId: string | null;

  setCurrentUser: (user: User) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setUsers: (users: User[]) => void;

  setElements: (elements: CanvasElement[]) => void;
  addOrUpdateStroke: (stroke: DrawElement) => void;
  addSticky: (sticky: StickyNoteElement) => void;
  updateSticky: (sticky: StickyNoteElement) => void;
  addImage: (img: ImageElement) => void;

  setViewport: (vp: Partial<Viewport>) => void;
  setCurrentTool: (tool: ToolType) => void;
  setBrushColor: (color: string) => void;
  setBrushThickness: (t: number) => void;
  setIsPanning: (p: boolean) => void;
  setActiveStickyId: (id: string | null) => void;
  setIsConnected: (c: boolean) => void;

  findUser: (userId: string) => User | undefined;

  saveCanvas: () => Promise<boolean>;
  loadCanvas: () => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  currentUser: null,
  users: [],
  elements: [],
  viewport: { offsetX: 0, offsetY: 0, scale: 1 },
  currentTool: 'brush',
  brushColor: '#333333',
  brushThickness: 4,
  isConnected: false,
  isPanning: false,
  activeStickyId: null,

  setCurrentUser: (user) => set({ currentUser: user }),
  addUser: (user) => set((s) => ({ users: [...s.users.filter((u) => u.id !== user.id), user] })),
  removeUser: (userId) => set((s) => ({ users: s.users.filter((u) => u.id !== userId) })),
  setUsers: (users) => set({ users }),

  setElements: (elements) => set({ elements }),
  addOrUpdateStroke: (stroke) =>
    set((s) => {
      const idx = s.elements.findIndex((e) => e.id === stroke.id);
      if (idx >= 0) {
        const next = [...s.elements];
        next[idx] = stroke;
        return { elements: next };
      }
      return { elements: [...s.elements, stroke] };
    }),
  addSticky: (sticky) => set((s) => ({ elements: [...s.elements, sticky] })),
  updateSticky: (sticky) =>
    set((s) => {
      const idx = s.elements.findIndex((e) => e.id === sticky.id);
      if (idx >= 0) {
        const next = [...s.elements];
        next[idx] = sticky;
        return { elements: next };
      }
      return { elements: [...s.elements, sticky] };
    }),
  addImage: (img) => set((s) => ({ elements: [...s.elements, img] })),

  setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushThickness: (t) => set({ brushThickness: t }),
  setIsPanning: (p) => set({ isPanning: p }),
  setActiveStickyId: (id) => set({ activeStickyId: id }),
  setIsConnected: (c) => set({ isConnected: c }),

  findUser: (userId) => get().users.find((u) => u.id === userId),

  saveCanvas: async () => {
    try {
      const res = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: get().elements }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
  loadCanvas: async () => {
    try {
      const res = await fetch('/api/canvas');
      const data = await res.json();
      if (data.elements) {
        set({ elements: data.elements });
      }
    } catch {
      console.error('Failed to load canvas');
    }
  },
}));
