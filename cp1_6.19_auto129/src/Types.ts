export const BPM = 120;
export const BEAT_INTERVAL = 60000 / BPM;
export const JUMP_FORCE = 13.5;
export const GRAVITY = 0.55;
export const PLAYER_SPEED = 4.5;
export const GROUND_Y_RATIO = 0.78;
export const PLAYER_SIZE = 22;
export const BEAT_POINT_SIZE = 20;
export const MAX_PARTICLES = 300;
export const TOTAL_BEAT_POINTS = 50;
export const LEVEL_LENGTH = 12000;

export const COLORS = {
  BG_TOP_START: '#0a0a2e',
  BG_BOTTOM_START: '#1a0a3e',
  BG_TOP_END: '#2e0a1a',
  BG_BOTTOM_END: '#3e1a0a',
  PLAYER_CORE: '#00f0ff',
  PLAYER_GLOW: '#00a8ff',
  PLAYER_OUTER: '#ff00ff',
  BEAT_POINT: '#ffd700',
  BEAT_POINT_GLOW: '#ffaa00',
  SPIKE: '#ff3366',
  SPIKE_GLOW: '#ff0066',
  GROUND_EDGE: '#66ffea',
  OBSTACLE_EDGE: '#00e0ff',
  COMBO_COLOR: '#00f0ff',
  SCORE_COLOR: '#ffffff',
  PROGRESS_START: '#ff00ff',
  PROGRESS_MID: '#00f0ff',
  PROGRESS_END: '#66ffea',
  NEON_CYAN: '#00f0ff',
  NEON_MAGENTA: '#ff00ff',
  NEON_GREEN: '#66ffea',
  NEON_PINK: '#ff66b2',
  NEON_BLUE: '#0088ff',
  DIAMOND_X1: '#8888aa',
  DIAMOND_X2: '#00aa88',
  DIAMOND_X3: '#0088ff',
  DIAMOND_X4: '#cc00ff',
  DIAMOND_X5: '#ffdd00',
};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface BeatPoint {
  x: number;
  y: number;
  hit: boolean;
  phase: number;
  glowPulse: number;
}

export interface Spike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafePoint {
  x: number;
  y: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
}

export interface ScreenShake {
  active: boolean;
  duration: number;
  maxDuration: number;
  amplitude: number;
  x: number;
  y: number;
}

export interface ComboPulse {
  scale: number;
  targetScale: number;
  animating: boolean;
}

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'FINISHED';

export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface GameData {
  score: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  progress: number;
  grade: ScoreGrade;
}

export interface ResultPanelAnim {
  active: boolean;
  progress: number;
  scoreRolling: number;
  targetScore: number;
}

export interface DiamondIcon {
  filled: boolean;
  color: string;
  pulse: number;
}
