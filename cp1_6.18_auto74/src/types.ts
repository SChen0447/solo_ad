export type HeroClass = 'warrior' | 'mage' | 'archer' | 'assassin' | 'paladin' | 'warlock';

export interface Skill {
  name: string;
  damage: number;
  multiplier: number;
  description: string;
  icon: string;
}

export interface Hero {
  id: string;
  name: string;
  heroClass: HeroClass;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  skill: Skill;
  cooldown: number;
  maxCooldown: number;
  isAlive: boolean;
  unlockCost: number;
  unlocked: boolean;
  skinVariant: number;
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  isAlive: boolean;
  x: number;
  y: number;
}

export interface DamagePopup {
  id: string;
  value: number;
  isCrit: boolean;
  x: number;
  y: number;
  timestamp: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Score {
  grade: 'S' | 'A' | 'B' | 'C';
  remainingHpRatio: number;
  rounds: number;
  points: number;
}

export type Phase = 'select' | 'battle' | 'result';

export interface BattleState {
  heroes: Hero[];
  enemies: Enemy[];
  round: number;
  log: string[];
  isPlayerTurn: boolean;
  isAutoMode: boolean;
  phase: Phase;
  score: Score;
  winStreak: number;
  totalScore: number;
  damagePopups: DamagePopup[];
  particles: Particle[];
  screenShake: boolean;
  isBattleOver: boolean;
  isVictory: boolean;
  logModalOpen: boolean;
  displayedLogCount: number;
}

export interface UnlockedSkins {
  [heroId: string]: number[];
}

export const SKILL_ICONS: Record<HeroClass, string> = {
  warrior: 'sword',
  mage: 'staff',
  archer: 'bow',
  assassin: 'dagger',
  paladin: 'shield',
  warlock: 'skull',
};

export const SKIN_COLORS: Record<number, string[]> = {
  0: ['#C0A060', '#8B6914'],
  1: ['#4A90D9', '#1565C0'],
  2: ['#9C27B0', '#6A1B9A'],
  3: ['#E53935', '#B71C1C'],
  4: ['#00BCD4', '#006064'],
};
