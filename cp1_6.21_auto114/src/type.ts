export enum ElementType {
  EMPTY = 'empty',
  WATER = 'water',
  SAND = 'sand',
  WOOD = 'wood',
  FIRE = 'fire',
  SMOKE = 'smoke',
  STEAM = 'steam',
  ASH = 'ash'
}

export interface Position {
  x: number;
  y: number;
}

export interface Cell {
  type: ElementType;
  lifetime: number;
  burnTimer: number;
  updated: boolean;
  velocityX: number;
  velocityY: number;
  opacity: number;
}

export interface GridState {
  width: number;
  height: number;
  cells: Cell[][];
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ElementInfo {
  name: string;
  color: string;
  colorRgb: { r: number; g: number; b: number };
  key: string;
}

export const GRID_WIDTH = 100;
export const GRID_HEIGHT = 100;
export const CELL_SIZE = 2;

export const ELEMENT_INFO: Record<ElementType, ElementInfo> = {
  [ElementType.EMPTY]: {
    name: '空',
    color: 'transparent',
    colorRgb: { r: 0, g: 0, b: 0 },
    key: '0'
  },
  [ElementType.WATER]: {
    name: '水',
    color: '#3498db',
    colorRgb: { r: 52, g: 152, b: 219 },
    key: '1'
  },
  [ElementType.SAND]: {
    name: '沙',
    color: '#f1c40f',
    colorRgb: { r: 241, g: 196, b: 15 },
    key: '2'
  },
  [ElementType.WOOD]: {
    name: '木',
    color: '#8b4513',
    colorRgb: { r: 139, g: 69, b: 19 },
    key: '3'
  },
  [ElementType.FIRE]: {
    name: '火',
    color: '#e74c3c',
    colorRgb: { r: 231, g: 76, b: 60 },
    key: '4'
  },
  [ElementType.SMOKE]: {
    name: '烟',
    color: '#95a5a6',
    colorRgb: { r: 149, g: 165, b: 166 },
    key: '5'
  },
  [ElementType.STEAM]: {
    name: '蒸汽',
    color: '#ecf0f1',
    colorRgb: { r: 236, g: 240, b: 241 },
    key: ''
  },
  [ElementType.ASH]: {
    name: '灰烬',
    color: '#2c3e50',
    colorRgb: { r: 44, g: 62, b: 80 },
    key: ''
  }
};

export const PLACEABLE_ELEMENTS = [
  ElementType.WATER,
  ElementType.SAND,
  ElementType.WOOD,
  ElementType.FIRE,
  ElementType.SMOKE
];
