import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Shape,
  AnimationTrack,
  Conflict,
  ShapeType,
  AnimationType,
  ScheduleMode,
  ShapeState,
} from './types';
import { detectConflicts, applyScheduleMode } from './conflictDetector';
import { getTotalDuration, computeAllStatesAtTime } from './animationEngine';

let shapeCounter = 1;

const SHAPE_DEFAULTS: Record<ShapeType, { width: number; height: number }> = {
  rect: { width: 120, height: 80 },
  circle: { width: 100, height: 100 },
  triangle: { width: 100, height: 90 },
};

interface AppState {
  shapes: Shape[];
  tracks: AnimationTrack[];
  conflicts: Conflict[];
  selectedShapeId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  speed: number;
  scheduleMode: ScheduleMode;
  shapeStates: Record<string, ShapeState>;

  addShape: (type: ShapeType, x: number, y: number) => void;
  removeShape: (id: string) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  selectShape: (id: string | null) => void;

  addTrack: (shapeId: string, type: AnimationType) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<AnimationTrack>) => void;

  setCurrentTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  tick: (t: number) => void;

  setScheduleMode: (mode: ScheduleMode) => void;
  recomputeConflicts: () => void;
  recomputeStates: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  shapes: [],
  tracks: [],
  conflicts: [],
  selectedShapeId: null,
  currentTime: 0,
  duration: 10,
  isPlaying: false,
  speed: 1,
  scheduleMode: 'none',
  shapeStates: {},

  addShape: (type, x, y) => {
    const def = SHAPE_DEFAULTS[type];
    const nameMap: Record<ShapeType, string> = {
      rect: '矩形',
      circle: '圆形',
      triangle: '三角形',
    };
    const shape: Shape = {
      id: uuidv4(),
      type,
      name: `${nameMap[type]} ${shapeCounter++}`,
      x,
      y,
      width: def.width,
      height: def.height,
      rotation: 0,
      scale: 1,
      initialX: x,
      initialY: y,
      initialRotation: 0,
      initialScale: 1,
    };
    set((s) => {
      const newShapes = [...s.shapes, shape];
      const newStates = { ...s.shapeStates, [shape.id]: { x, y, rotation: 0, scale: 1 } };
      return { shapes: newShapes, selectedShapeId: shape.id, shapeStates: newStates };
    });
    get().recomputeConflicts();
  },

  removeShape: (id) => {
    set((s) => ({
      shapes: s.shapes.filter((sh) => sh.id !== id),
      tracks: s.tracks.filter((t) => t.shapeId !== id),
      selectedShapeId: s.selectedShapeId === id ? null : s.selectedShapeId,
    }));
    get().recomputeConflicts();
    get().recomputeStates();
  },

  updateShape: (id, updates) => {
    set((s) => ({
      shapes: s.shapes.map((sh) =>
        sh.id === id
          ? {
              ...sh,
              ...updates,
              initialX: updates.x ?? sh.initialX,
              initialY: updates.y ?? sh.initialY,
              initialRotation: updates.rotation ?? sh.initialRotation,
              initialScale: updates.scale ?? sh.initialScale,
            }
          : sh
      ),
    }));
    get().recomputeStates();
  },

  selectShape: (id) => set({ selectedShapeId: id }),

  addTrack: (shapeId, type) => {
    const track: AnimationTrack = {
      id: uuidv4(),
      shapeId,
      type,
      startTime: 0,
      duration: 3,
      endValue: type === 'rotate' ? 360 : type === 'scale' ? 1.5 : 200,
      easing: 'linear',
      priority: 1,
      isActive: true,
    };
    set((s) => ({ tracks: [...s.tracks, track] }));
    get().recomputeConflicts();
    get().recomputeStates();
  },

  removeTrack: (trackId) => {
    set((s) => ({ tracks: s.tracks.filter((t) => t.id !== trackId) }));
    get().recomputeConflicts();
    get().recomputeStates();
  },

  updateTrack: (trackId, updates) => {
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)) }));
    get().recomputeConflicts();
    get().recomputeStates();
  },

  setCurrentTime: (t) => {
    const time = Math.max(0, Math.min(get().duration, t));
    set({ currentTime: time });
    get().recomputeStates();
  },

  setPlaying: (p) => set({ isPlaying: p }),

  setSpeed: (s) => set({ speed: s }),

  tick: (t) => {
    set({ currentTime: t });
    get().recomputeStates();
  },

  setScheduleMode: (mode) => {
    const { conflicts, tracks } = get();
    const newTracks = applyScheduleMode(mode, tracks, conflicts);
    const newDuration = getTotalDuration(newTracks);
    set({ scheduleMode: mode, tracks: newTracks, duration: newDuration });
    get().recomputeConflicts();
    get().recomputeStates();
  },

  recomputeConflicts: () => {
    const { shapes, tracks, duration } = get();
    const conflicts = detectConflicts(shapes, tracks, duration);
    set({ conflicts });
  },

  recomputeStates: () => {
    const { shapes, tracks, currentTime } = get();
    const states = computeAllStatesAtTime(shapes, tracks, currentTime);
    set({ shapeStates: states });
  },
}));
