export type Biome = 'plain' | 'mountain' | 'water';

export interface MapTile {
  x: number;
  y: number;
  biome: Biome;
  walkable: boolean;
  elevation?: number[];
  obstacle: boolean;
}

export interface Region {
  id: string;
  tiles: Array<{ x: number; y: number }>;
  biome: Biome;
}

export type UnitState = 'idle' | 'moving' | 'attacking';

export interface Unit {
  id: string;
  name: string;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  hp: number;
  maxHp: number;
  speed: number;
  state: UnitState;
  path: Array<{ x: number; y: number }>;
  pathIndex: number;
  selected: boolean;
  formationOffset?: { dx: number; dy: number };
}

export interface Obstacle {
  id: string;
  gridX: number;
  gridY: number;
  createdAt: number;
}

export interface GameState {
  tiles: MapTile[][];
  units: Unit[];
  obstacles: Obstacle[];
  selectedUnitIds: string[];
  zoom: number;
  fps: number;
}

export const TILE_SIZE = 48;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 20;
export const UNIT_RADIUS = 10;
export const MIN_FORMATION_DISTANCE = 15;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;
export const ZOOM_DURATION = 200;

export const COLORS = {
  bg: '#0a0a2e',
  panelBg: 'rgba(26, 26, 46, 0.8)',
  plain: '#7cbd7c',
  mountain: '#8b5e3c',
  water: '#4a90e2',
  gridLine: '#e0e0e0',
  unit: '#4488ff',
  selected: 'rgba(0, 255, 0, 0.376)',
  obstacle: '#ff4444',
  path: 'rgba(255, 255, 255, 0.376)',
  selectionBox: 'rgba(68, 136, 255, 0.188)',
  hpBar: '#22c55e',
  statusBar: '#1a1a2e',
  minimapUnit: '#ff0000'
};
