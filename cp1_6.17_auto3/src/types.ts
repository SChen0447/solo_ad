export enum CardType {
  Attack = 'attack',
  Defense = 'defense',
  Heal = 'heal',
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  value: number;
  minValue?: number;
  maxValue?: number;
  description: string;
  icon: string;
}

export interface CharacterBase {
  hp: number;
  maxHp: number;
  shield: number;
  shieldTurnsLeft: number;
}

export interface Player extends CharacterBase {
  energy: number;
  maxEnergy: number;
}

export interface Monster extends CharacterBase {
  name: string;
  attackMin: number;
  attackMax: number;
  breathPhase: number;
  shakeTimer: number;
  shakeIntensity: number;
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

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

export interface CardAnimation {
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  duration: number;
  type: CardType;
  completed: boolean;
}

export type GamePhase = 'playerTurn' | 'enemyTurn' | 'animating' | 'victory' | 'defeat';

export interface GameState {
  player: Player;
  monster: Monster;
  hand: Card[];
  deck: Card[];
  turn: number;
  phase: GamePhase;
  particles: Particle[];
  floatingTexts: FloatingText[];
  cardAnimations: CardAnimation[];
  battleLog: string[];
  hoveredCardIndex: number;
  restartButtonBounds: { x: number; y: number; w: number; h: number } | null;
  endTurnButtonBounds: { x: number; y: number; w: number; h: number } | null;
}
