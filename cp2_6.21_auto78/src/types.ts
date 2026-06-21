export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface GameState {
  score: number;
  collectedCount: number;
  isGameOver: boolean;
  screenFlash: number;
  progressPulse: number;
  player: {
    x: number;
    y: number;
    radius: number;
    speed: number;
    baseSpeed: number;
    speedMultiplier: number;
    isSlowed: boolean;
    slowTimer: number;
    slowDuration: number;
    flashCount: number;
    flashTimer: number;
    flashInterval: number;
    isVisible: boolean;
    borderAlpha: number;
  };
  obstacles: Obstacle[];
  collectibles: Collectible[];
  particles: Particle[];
  streakLines: StreakLine[];
  scoreAnim: {
    scale: number;
    targetScale: number;
    animTime: number;
    animDuration: number;
  };
  phase: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  passed: boolean;
}

export interface Collectible {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  pulsePhase: number;
  groupId: number;
}

export interface StreakLine {
  x: number;
  y: number;
  height: number;
  speed: number;
  alpha: number;
  color: string;
}

const TRAIL_COLORS = [
  '#FF3366', '#FF6633', '#FF9933', '#FFCC33', '#FFFF33',
  '#CCFF33', '#99FF33', '#66FF33', '#33FF33', '#33FF66',
  '#33FF99', '#33FFCC', '#33FFFF', '#33CCFF', '#3399FF',
  '#3366FF', '#3333FF', '#6633FF', '#9933FF', '#CC33FF'
];

export function randomTrailColor(): string {
  return TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)];
}
