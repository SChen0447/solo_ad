export type ElementType = 'fire' | 'water' | 'earth' | 'wind';
export type TileType = 'grass' | 'rock' | 'water';

export interface Crystal {
  id: string;
  element: ElementType;
  x: number;
  y: number;
  collected: boolean;
}

export interface Recipe {
  inputs: ElementType[];
  resultName: string;
  rarity: number;
  color: string;
}

export interface CraftResult {
  name: string;
  rarity: number;
  color: string;
  recipe: ElementType[];
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

export const TILE_SIZE = 32;
export const MAP_TILE_COLS = 100;
export const MAP_TILE_ROWS = 90;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_SPEED = 4;
export const INTERACTION_RADIUS = 40;
export const ALCHEMIST_TABLE_RADIUS = 60;
export const ALCHEMIST_TABLE_INTERACT_DIST = 80;
export const CRYSTAL_RESPAWN_INTERVAL = 5000;
export const CRYSTAL_RESPAWN_MIN_DIST = 150;
export const INITIAL_CRYSTAL_COUNT = 20;
export const MAX_CRYSTALS = 100;
export const CRAFT_SLOT_SIZE = 60;
export const CRAFT_SLOT_COUNT = 4;
export const PARTICLE_COUNT = 30;
export const MAX_PARTICLES = 50;

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff4444',
  water: '#4488ff',
  earth: '#8B4513',
  wind: '#44cc44',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火之结晶',
  water: '水之结晶',
  earth: '土之结晶',
  wind: '风之结晶',
};

export const ELEMENT_DESCS: Record<ElementType, string> = {
  fire: '燃烧着灼热火焰的结晶',
  water: '蕴含纯净水源的结晶',
  earth: '沉淀着大地之力的结晶',
  wind: '飘散着疾风气息的结晶',
};

export const TILE_COLORS: Record<TileType, string> = {
  grass: '#4caf50',
  rock: '#5d4037',
  water: '#2196F3',
};
