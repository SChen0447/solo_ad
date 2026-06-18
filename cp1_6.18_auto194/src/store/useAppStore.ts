import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  ComponentProps,
  Snapshot,
  ComponentType,
  AlignLine,
} from '@/types/componentTypes';
import { componentRegistries } from './componentRegistry';

interface HistoryState {
  past: ComponentProps[][];
  future: ComponentProps[][];
}

interface AppState {
  components: ComponentProps[];
  selectedComponentId: string | null;
  snapshots: Snapshot[];
  zoom: number;
  alignLines: AlignLine[];
  history: HistoryState;
  diffSnapshotA: string | null;
  diffSnapshotB: string | null;
  showDiffViewer: boolean;

  addComponent: (type: ComponentType, x: number, y: number) => void;
  removeComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  updateComponentProps: (id: string, props: Partial<ComponentProps>) => void;
  selectComponent: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setAlignLines: (lines: AlignLine[]) => void;

  saveSnapshot: () => void;
  removeSnapshot: (id: string) => void;
  setDiffSnapshotA: (id: string | null) => void;
  setDiffSnapshotB: (id: string | null) => void;
  setShowDiffViewer: (show: boolean) => void;

  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
}

const MAX_HISTORY = 50;
const MAX_SNAPSHOTS = 10;

export const useAppStore = create<AppState>((set, get) => ({
  components: [],
  selectedComponentId: null,
  snapshots: [],
  zoom: 100,
  alignLines: [],
  history: { past: [], future: [] },
  diffSnapshotA: null,
  diffSnapshotB: null,
  showDiffViewer: false,

  addComponent: (type, x, y) => {
    const registry = componentRegistries[type];
    const newComponent: ComponentProps = {
      id: uuidv4(),
      type,
      x,
      y,
      ...registry.defaultProps,
    } as ComponentProps;

    set((state) => {
      const newPast = [...state.history.past, state.components].slice(-MAX_HISTORY);
      return {
        components: [...state.components, newComponent],
        selectedComponentId: newComponent.id,
        history: { past: newPast, future: [] },
      };
    });
  },

  removeComponent: (id) => {
    set((state) => {
      const newPast = [...state.history.past, state.components].slice(-MAX_HISTORY);
      return {
        components: state.components.filter((c) => c.id !== id),
        selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
        history: { past: newPast, future: [] },
      };
    });
  },

  duplicateComponent: (id) => {
    set((state) => {
      const source = state.components.find((c) => c.id === id);
      if (!source) return state;

      const duplicate: ComponentProps = {
        ...source,
        id: uuidv4(),
        x: source.x + 30,
        y: source.y + 30,
      };

      const newPast = [...state.history.past, state.components].slice(-MAX_HISTORY);
      return {
        components: [...state.components, duplicate],
        selectedComponentId: duplicate.id,
        history: { past: newPast, future: [] },
      };
    });
  },

  updateComponentProps: (id, props) => {
    set((state) => {
      const newPast = [...state.history.past, state.components].slice(-MAX_HISTORY);
      return {
        components: state.components.map((c) =>
          c.id === id ? ({ ...c, ...props } as ComponentProps) : c
        ),
        history: { past: newPast, future: [] },
      };
    });
  },

  selectComponent: (id) => {
    set({ selectedComponentId: id });
  },

  setZoom: (zoom) => {
    const clamped = Math.max(25, Math.min(200, zoom));
    set({ zoom: clamped });
  },

  setAlignLines: (lines) => {
    set({ alignLines: lines });
  },

  saveSnapshot: () => {
    set((state) => {
      const snapshot: Snapshot = {
        id: uuidv4(),
        name: new Date().toLocaleString('zh-CN'),
        timestamp: Date.now(),
        components: JSON.parse(JSON.stringify(state.components)),
      };

      let newSnapshots = [...state.snapshots, snapshot];
      if (newSnapshots.length > MAX_SNAPSHOTS) {
        newSnapshots = newSnapshots.slice(-MAX_SNAPSHOTS);
      }

      return { snapshots: newSnapshots };
    });
  },

  removeSnapshot: (id) => {
    set((state) => ({
      snapshots: state.snapshots.filter((s) => s.id !== id),
    }));
  },

  setDiffSnapshotA: (id) => {
    set({ diffSnapshotA: id });
  },

  setDiffSnapshotB: (id) => {
    set({ diffSnapshotB: id });
  },

  setShowDiffViewer: (show) => {
    set({ showDiffViewer: show });
  },

  undo: () => {
    set((state) => {
      if (state.history.past.length === 0) return state;

      const newPast = [...state.history.past];
      const previous = newPast.pop()!;
      const newFuture = [state.components, ...state.history.future];

      return {
        components: previous,
        selectedComponentId: null,
        history: { past: newPast, future: newFuture },
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.history.future.length === 0) return state;

      const newFuture = [...state.history.future];
      const next = newFuture.shift()!;
      const newPast = [...state.history.past, state.components];

      return {
        components: next,
        selectedComponentId: null,
        history: { past: newPast, future: newFuture },
      };
    });
  },

  clearCanvas: () => {
    set((state) => {
      const newPast = [...state.history.past, state.components].slice(-MAX_HISTORY);
      return {
        components: [],
        selectedComponentId: null,
        history: { past: newPast, future: [] },
      };
    });
  },
}));
