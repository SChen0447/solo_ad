import { create } from 'zustand';
import type { Stroke, BrushType } from './canvasEngine';

const PALETTE_COLORS = [
  '#1a1a1a',
  '#c0392b',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#1abc9c',
  '#3498db',
  '#9b59b6',
  '#e91e63',
  '#795548',
  '#95a5a6',
  '#ffffff',
];

export interface HistoryState {
  strokes: Stroke[];
  redoStack: Stroke[];
  animatingStroke: { stroke: Stroke; reverse: boolean; progress: number } | null;
}

export class HistoryManager {
  private listeners: Set<() => void> = new Set();

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  async animateUndo(
    stroke: Stroke,
    onProgress: (progress: number, remainingStroke: Stroke) => void,
    onComplete: () => void
  ) {
    const duration = 200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const keptPoints = Math.max(0, Math.floor(stroke.points.length * (1 - progress)));
      onProgress(progress, { ...stroke, points: stroke.points.slice(0, keptPoints) });
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    requestAnimationFrame(animate);
  }

  async animateRedo(
    stroke: Stroke,
    onProgress: (progress: number, partialStroke: Stroke) => void,
    onComplete: () => void
  ) {
    const duration = 200;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const keptPoints = Math.max(1, Math.floor(stroke.points.length * progress));
      onProgress(progress, { ...stroke, points: stroke.points.slice(0, keptPoints) });
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    requestAnimationFrame(animate);
  }
}

interface DrawingState {
  strokes: Stroke[];
  redoStack: Stroke[];
  currentStroke: Stroke | null;
  previewStroke: Stroke | null;
  color: string;
  brushSize: number;
  brushType: BrushType;
  timelineIndex: number;
  isAnimating: boolean;
  paletteColors: string[];
  historyManager: HistoryManager;

  setCurrentStroke: (s: Stroke | null) => void;
  setPreviewStroke: (s: Stroke | null) => void;
  addStroke: (stroke: Stroke) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  setColor: (c: string) => void;
  setBrushSize: (s: number) => void;
  setBrushType: (t: BrushType) => void;
  setTimelineIndex: (i: number) => void;
  setIsAnimating: (v: boolean) => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  strokes: [],
  redoStack: [],
  currentStroke: null,
  previewStroke: null,
  color: PALETTE_COLORS[0],
  brushSize: 4,
  brushType: 'hard',
  timelineIndex: -1,
  isAnimating: false,
  paletteColors: PALETTE_COLORS,
  historyManager: new HistoryManager(),

  setCurrentStroke: (s) => set({ currentStroke: s }),
  setPreviewStroke: (s) => set({ previewStroke: s }),

  addStroke: (stroke) => {
    const state = get();
    let newStrokes = state.strokes;
    if (state.timelineIndex >= 0 && state.timelineIndex < state.strokes.length - 1) {
      newStrokes = state.strokes.slice(0, state.timelineIndex + 1);
    }
    set({
      strokes: [...newStrokes, stroke],
      redoStack: [],
      currentStroke: null,
      timelineIndex: -1,
    });
  },

  undo: () => {
    const state = get();
    if (state.strokes.length === 0 || state.isAnimating) return;
    set({ isAnimating: true });
    const lastStroke = state.strokes[state.strokes.length - 1];
    state.historyManager.animateUndo(
      lastStroke,
      (progress, partialStroke) => {
        const s = get();
        set({
          strokes: [...s.strokes.slice(0, -1)],
          previewStroke: partialStroke.points.length > 1 ? partialStroke : null,
        });
      },
      () => {
        const s = get();
        set({
          strokes: s.strokes,
          redoStack: [lastStroke, ...s.redoStack],
          previewStroke: null,
          isAnimating: false,
        });
      }
    );
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0 || state.isAnimating) return;
    set({ isAnimating: true });
    const nextStroke = state.redoStack[0];
    state.historyManager.animateRedo(
      nextStroke,
      (progress, partialStroke) => {
        set({ previewStroke: partialStroke });
      },
      () => {
        const s = get();
        set({
          strokes: [...s.strokes, nextStroke],
          redoStack: s.redoStack.slice(1),
          previewStroke: null,
          isAnimating: false,
        });
      }
    );
  },

  clear: () => set({ strokes: [], redoStack: [], currentStroke: null, previewStroke: null, timelineIndex: -1 }),

  setColor: (c) => set({ color: c }),
  setBrushSize: (s) => set({ brushSize: Math.max(1, Math.min(20, s)) }),
  setBrushType: (t) => set({ brushType: t }),
  setTimelineIndex: (i) => set({ timelineIndex: i }),
  setIsAnimating: (v) => set({ isAnimating: v }),
}));
