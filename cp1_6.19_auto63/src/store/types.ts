export type RuneType = 'growth' | 'bloom' | 'mutation';

export interface TrajectoryPoint {
  x: number;
  y: number;
  time: number;
}

export interface Flower {
  id: string;
  color: string;
  petalCount: number;
  createdAt: number;
  x: number;
  y: number;
}

export interface Crystal {
  id: string;
  x: number;
  y: number;
  rotation: number;
}

export interface Leaf {
  id: string;
  side: 'left' | 'right';
  y: number;
  colorIndex: number;
}

export interface Plant {
  id: string;
  stemHeight: number;
  leaves: Leaf[];
  flowers: Flower[];
  crystals: Crystal[];
  isMutating: boolean;
  mutationEndsAt: number;
  growthAnimation: number;
  bloomAnimation: number;
  wilting: boolean;
  dirty: boolean;
}

export interface GameState {
  energy: number;
  maxEnergy: number;
  water: number;
  waterCooldownUntil: number;
  plants: Plant[];
  selectedRuneId: string | null;
  lastEnergyRegen: number;
  lastWaterDecay: number;
  runeFeedback: { type: 'success' | 'error'; msg: string; time: number } | null;

  applyRune: (runeType: RuneType) => boolean;
  waterPlant: () => boolean;
  updateGrowth: (now: number) => void;
  clearFeedback: () => void;
}

export const FLOWER_COLORS = ['#ff4081', '#ffeb3b', '#e040fb'];
export const RUNE_COST = 20;
export const ENERGY_REGEN_INTERVAL = 30000;
export const ENERGY_REGEN_AMOUNT = 10;
export const WATER_DECAY_INTERVAL = 10000;
export const WATER_COOLDOWN = 3000;
export const WATER_AMOUNT = 20;
export const MAX_STEM_HEIGHT = 200;
export const MIN_STEM_HEIGHT = 40;
export const GROWTH_INCREMENT = 10;
export const FLOWER_LIFETIME = 20000;
export const MUTATION_LIFETIME = 15000;
export const GROWTH_ANIM_DURATION = 500;
export const BLOOM_ANIM_DURATION = 800;
export const WILT_THRESHOLD = 10;
export const BREATH_PERIOD = 3000;

export const uid = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const rand = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));
