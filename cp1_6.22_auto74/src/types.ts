export type CropType = 'carrot' | 'wheat' | 'tomato' | 'sunflower';

export type GrowthStage = 0 | 1 | 2;

export type DecorationType = 'scarecrow' | 'fence' | 'windmill';

export interface Crop {
  type: CropType;
  stage: GrowthStage;
  growthProgress: number;
  totalTime: number;
  remainingTime: number;
}

export interface Tile {
  col: number;
  row: number;
  crop: Crop | null;
  watered: boolean;
  decoration: DecorationType | null;
  waterAnimation: number;
  harvestAnimation: number;
  pressed: number;
}

export interface CropConfig {
  name: string;
  seedPrice: number;
  harvestReward: number;
  growthTime: number;
  color: string;
}

export interface DecorationConfig {
  name: string;
  price: number;
}

export interface Inventory {
  seeds: Record<CropType, number>;
  decorations: DecorationType[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'coin' | 'water' | 'splash';
  color?: string;
  size: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export interface SoundText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

export const GRID_COLS = 8;
export const GRID_ROWS = 6;
export const TILE_SIZE = 60;
export const TILE_SIZE_SMALL = 40;
export const GRID_LINE_WIDTH = 2;
export const TOOLBAR_HEIGHT = 80;
export const TOOLBAR_HEIGHT_SMALL = 70;

export const CROP_CONFIGS: Record<CropType, CropConfig> = {
  carrot: { name: '胡萝卜', seedPrice: 5, harvestReward: 10, growthTime: 30, color: '#f97316' },
  wheat: { name: '小麦', seedPrice: 3, harvestReward: 8, growthTime: 45, color: '#fbbf24' },
  tomato: { name: '番茄', seedPrice: 8, harvestReward: 12, growthTime: 60, color: '#ef4444' },
  sunflower: { name: '向日葵', seedPrice: 10, harvestReward: 15, growthTime: 90, color: '#facc15' },
};

export const INITIAL_SEEDS: Record<CropType, number> = {
  carrot: -1,
  wheat: 20,
  tomato: 10,
  sunflower: 5,
};

export const DECORATION_CONFIGS: Record<DecorationType, DecorationConfig> = {
  scarecrow: { name: '稻草人', price: 50 },
  fence: { name: '木栅栏', price: 20 },
  windmill: { name: '风车', price: 80 },
};

export const INITIAL_COINS = 100;

export const COLORS = {
  grass: '#2d5016',
  grassLight: '#3a6b1e',
  grassDark: '#223f11',
  wood: '#5c3a21',
  woodDark: '#4a2e1a',
  woodLight: '#7a4e2d',
  toolbar: '#2d3748',
  toolbarLight: '#4a5568',
  btnGreen: '#48bb78',
  btnGreenPressed: '#38a169',
  btnGreenBorder: '#2f855a',
  gold: '#ecc94b',
  goldDark: '#d69e2e',
  white: '#ffffff',
  black: '#1a202c',
  progressStart: '#48bb78',
  progressEnd: '#ecc94b',
  water: '#63b3ed',
  panelBg: '#1a202c',
  panelBorder: '#4a5568',
};
