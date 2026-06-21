import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { PlacedComponent, HistoryEntry, LayoutData, ComponentCategory } from '@/types';
import { getAllCategories } from '@/modules/componentLibrary';

interface AppState {
  timeHour: number;
  setTimeHour: (h: number) => void;

  components: PlacedComponent[];
  addComponent: (templateId: string, position: [number, number, number]) => string;
  moveComponent: (id: string, position: [number, number, number]) => void;
  removeComponent: (id: string) => void;
  replaceAllComponents: (comps: PlacedComponent[]) => void;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  draggingTemplateId: string | null;
  setDraggingTemplateId: (id: string | null) => void;
  previewPosition: [number, number, number] | null;
  setPreviewPosition: (pos: [number, number, number] | null) => void;

  expandedCategories: Record<ComponentCategory, boolean>;
  toggleCategory: (cat: ComponentCategory) => void;

  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  animatingIn: Set<string>;
  addAnimatingIn: (id: string) => void;
  removeAnimatingIn: (id: string) => void;
  animatingOut: Set<string>;
  addAnimatingOut: (id: string) => void;
  removeAnimatingOut: (id: string) => void;

  serialize: () => LayoutData;
}

const defaultCategories: Record<ComponentCategory, boolean> = getAllCategories().reduce(
  (acc, c) => ({ ...acc, [c.key]: true }),
  {} as Record<ComponentCategory, boolean>,
);

const MAX_HISTORY = 20;

export const useAppStore = create<AppState>((set, get) => ({
  timeHour: 12,
  setTimeHour: (h) => set({ timeHour: Math.max(0, Math.min(24, h)) }),

  components: [],
  addComponent: (templateId, position) => {
    const id = uuidv4();
    const newComp: PlacedComponent = {
      id,
      templateId,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    set((state) => ({ components: [...state.components, newComp] }));
    get().addAnimatingIn(id);
    get().pushHistory();
    return id;
  },
  moveComponent: (id, position) => {
    set((state) => ({
      components: state.components.map((c) => (c.id === id ? { ...c, position } : c)),
    }));
  },
  removeComponent: (id) => {
    get().addAnimatingOut(id);
    setTimeout(() => {
      set((state) => {
        const nextComponents = state.components.filter((c) => c.id !== id);
        return {
          components: nextComponents,
          selectedId: state.selectedId === id ? null : state.selectedId,
          animatingOut: new Set([...state.animatingOut].filter((x) => x !== id)),
        };
      });
      get().pushHistory();
    }, 320);
  },
  replaceAllComponents: (comps) => {
    set({ components: comps, selectedId: null, history: [], historyIndex: -1 });
    get().pushHistory();
  },

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  draggingTemplateId: null,
  setDraggingTemplateId: (id) => set({ draggingTemplateId: id, previewPosition: id ? null : undefined }),
  previewPosition: null,
  setPreviewPosition: (pos) => set({ previewPosition: pos }),

  expandedCategories: defaultCategories,
  toggleCategory: (cat) =>
    set((state) => ({
      expandedCategories: { ...state.expandedCategories, [cat]: !state.expandedCategories[cat] },
    })),

  history: [],
  historyIndex: -1,
  pushHistory: () => {
    const { components, history, historyIndex } = get();
    const snapshot = JSON.parse(JSON.stringify(components)) as PlacedComponent[];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ action: 'move', snapshot });
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      set({ history: newHistory, historyIndex: newHistory.length - 1 });
      return;
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIdx = historyIndex - 1;
    const snapshot = JSON.parse(JSON.stringify(history[newIdx].snapshot)) as PlacedComponent[];
    set({ components: snapshot, historyIndex: newIdx, selectedId: null });
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIdx = historyIndex + 1;
    const snapshot = JSON.parse(JSON.stringify(history[newIdx].snapshot)) as PlacedComponent[];
    set({ components: snapshot, historyIndex: newIdx, selectedId: null });
  },
  canUndo: false,
  canRedo: false,

  animatingIn: new Set(),
  addAnimatingIn: (id) => set((s) => ({ animatingIn: new Set([...s.animatingIn, id]) })),
  removeAnimatingIn: (id) => set((s) => ({ animatingIn: new Set([...s.animatingIn].filter((x) => x !== id)) })),
  animatingOut: new Set(),
  addAnimatingOut: (id) => set((s) => ({ animatingOut: new Set([...s.animatingOut, id]) })),
  removeAnimatingOut: (id) => set((s) => ({ animatingOut: new Set([...s.animatingOut].filter((x) => x !== id)) })),

  serialize: () => ({
    components: JSON.parse(JSON.stringify(get().components)),
    createdAt: Date.now(),
    version: '1.0',
  }),
}));

// 派生计算 canUndo/canRedo
useAppStore.subscribe(
  (state) => ({ h: state.history, i: state.historyIndex }),
  (derived) => {
    useAppStore.setState({
      canUndo: derived.i > 0,
      canRedo: derived.i < derived.h.length - 1,
    });
  },
  { fireImmediately: true },
);
