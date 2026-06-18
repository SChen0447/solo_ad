export type SymbolShape = 'circle' | 'triangle' | 'diamond' | 'star';

export interface SymbolColor {
  r: number;
  g: number;
  b: number;
}

export interface Symbol {
  id: string;
  shape: SymbolShape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: SymbolColor;
  baseColor: SymbolColor;
}

export interface Ripple {
  id: string;
  x: number;
  y: number;
  startTime: number;
}

export interface PhysicsParams {
  gravity: number;
  elasticity: number;
  blendThreshold: number;
}

export interface CanvasState {
  width: number;
  height: number;
  gridSize: number;
  gridOpacity: number;
  backgroundColor: string;
}

export interface SymbolWallState {
  symbols: Symbol[];
  ripples: Ripple[];
  physicsParams: PhysicsParams;
  canvasState: CanvasState;
  addSymbol: (x: number, y: number) => void;
  addRipple: (x: number, y: number) => void;
  removeRipple: (id: string) => void;
  setPhysicsParams: (params: Partial<PhysicsParams>) => void;
  setCanvasSize: (width: number, height: number) => void;
  updateSymbols: (symbols: Symbol[]) => void;
  reset: () => void;
}
