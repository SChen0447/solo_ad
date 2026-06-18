import { create } from 'zustand';
import type {
  Symbol,
  SymbolShape,
  SymbolColor,
  Ripple,
  SymbolWallState,
} from './types';

const SHAPES: SymbolShape[] = ['circle', 'triangle', 'diamond', 'star'];

const SHAPE_COLORS: Record<SymbolShape, SymbolColor> = {
  circle: { r: 255, g: 107, b: 107 },
  triangle: { r: 32, g: 191, b: 107 },
  diamond: { r: 75, g: 123, b: 236 },
  star: { r: 247, g: 183, b: 49 },
};

const generateId = (): string => {
  return Math.random().toString(36).slice(2, 11);
};

const getRandomShape = (): SymbolShape => {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
};

export const useSymbolWallStore = create<SymbolWallState>((set) => ({
  symbols: [],
  ripples: [],
  physicsParams: {
    gravity: 1,
    elasticity: 0.8,
    blendThreshold: 10,
  },
  canvasState: {
    width: 800,
    height: 600,
    gridSize: 40,
    gridOpacity: 0.15,
    backgroundColor: '#0d0d2b',
  },
  addSymbol: (x, y) =>
    set((state) => {
      const shape = getRandomShape();
      const color = { ...SHAPE_COLORS[shape] };
      const newSymbol: Symbol = {
        id: generateId(),
        shape,
        x,
        y,
        vx: 0,
        vy: 0,
        color,
        baseColor: { ...color },
      };
      return { symbols: [...state.symbols, newSymbol] };
    }),
  addRipple: (x, y) =>
    set((state) => ({
      ripples: [...state.ripples, { id: generateId(), x, y, startTime: performance.now() }],
    })),
  removeRipple: (id) =>
    set((state) => ({
      ripples: state.ripples.filter((r) => r.id !== id),
    })),
  setPhysicsParams: (params) =>
    set((state) => ({
      physicsParams: { ...state.physicsParams, ...params },
    })),
  setCanvasSize: (width, height) =>
    set((state) => ({
      canvasState: { ...state.canvasState, width, height },
    })),
  updateSymbols: (symbols) => set({ symbols }),
  reset: () => set({ symbols: [], ripples: [] }),
}));
