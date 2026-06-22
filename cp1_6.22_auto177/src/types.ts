export interface Plant {
  id: string;
  gridX: number;
  gridY: number;
  level: 1 | 2 | 3;
  attackPower: number;
  range: number;
  attackSpeed: number;
  lastAttackTime: number;
  upgrading: boolean;
  upgradeStartTime: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  variant: 'normal' | 'shield' | 'fast';
  hp: number;
  maxHp: number;
  speed: number;
  shieldActive: boolean;
  lastShieldTime: number;
  hitFlashTime: number;
  dead: boolean;
  deathTime: number;
  opacity: number;
}

export interface Projectile {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startTime: number;
  duration: number;
  damage: number;
  targetId: string;
  hit: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  createdAt: number;
  duration: number;
  color: string;
  size: number;
}

export type GamePhase = 'idle' | 'playing' | 'waveTransition' | 'gameOver' | 'victory';

export interface UpgradeParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  createdAt: number;
  duration: number;
  color: string;
  size: number;
}

export const GRID_COLS = 20;
export const GRID_ROWS = 10;
export const CELL_SIZE = 40;
export const CELL_SIZE_SMALL = 30;
export const SMALL_SCREEN_BREAKPOINT = 800;

export const PLANT_LEVELS: Record<number, { cost: number; attackPower: number; range: number; attackSpeed: number }> = {
  1: { cost: 50, attackPower: 5, range: 3, attackSpeed: 1 },
  2: { cost: 150, attackPower: 12, range: 4, attackSpeed: 0.7 },
  3: { cost: 300, attackPower: 25, range: 5, attackSpeed: 0.5 },
};

export const ENEMY_CONFIGS: Record<string, { hp: number; speed: number; scale: number }> = {
  normal: { hp: 30, speed: 20, scale: 1 },
  shield: { hp: 50, speed: 20, scale: 1 },
  fast: { hp: 15, speed: 45, scale: 0.5 },
};

export const PROJECTILE_DURATION = 0.2;
export const PROJECTILE_SIZE = 8;
export const PROJECTILE_COLOR = '#4ade80';

export const MAX_LEAKS = 5;
export const TOTAL_WAVES = 5;
export const WAVE_INTERVAL = 10;
export const WAVE_TRANSITION_DURATION = 3;
export const SUNLIGHT_AUTO_AMOUNT = 5;
export const SUNLIGHT_AUTO_INTERVAL = 5;
export const SUNLIGHT_KILL_REWARD = 10;
export const INITIAL_SUNLIGHT = 50;

export const HIT_FLASH_DURATION = 0.1;
export const HIT_OPACITY_DURATION = 0.3;
export const DEATH_PARTICLE_COUNT = 5;
export const DEATH_PARTICLE_DURATION = 0.5;
export const UPGRADE_PARTICLE_COUNT = 8;
export const UPGRADE_PARTICLE_DURATION = 0.6;

export const SHIELD_COOLDOWN = 3;

export const WAVE_ENEMIES: { normal: number; shield: number; fast: number }[] = [
  { normal: 5, shield: 0, fast: 0 },
  { normal: 7, shield: 2, fast: 0 },
  { normal: 8, shield: 3, fast: 2 },
  { normal: 10, shield: 4, fast: 4 },
  { normal: 12, shield: 5, fast: 5 },
];

export const ENEMY_SPAWN_INTERVAL = 1.0;
