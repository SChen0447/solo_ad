export enum Rarity {
  Common = 'common',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary'
}

export interface Card {
  id: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
  maxHealth: number;
  rarity: Rarity;
  description: string;
  canAttack: boolean;
}

export interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  armor: number;
  maxMana: number;
  currentMana: number;
  deck: Card[];
  hand: Card[];
  field: Card[];
  isAI: boolean;
}

export interface GameState {
  player: Player;
  ai: Player;
  currentTurn: 'player' | 'ai';
  turnNumber: number;
  gameOver: boolean;
  winner: string | null;
  phase: 'draw' | 'main' | 'combat' | 'end';
}

export interface BattleLog {
  id: number;
  message: string;
  type: 'player' | 'ai' | 'system' | 'damage' | 'heal';
  timestamp: number;
}

export interface CardPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CardLocation = 'deck' | 'hand' | 'field';

export interface CardState {
  card: Card;
  position: CardPosition;
  location: CardLocation;
  owner: 'player' | 'ai';
  index: number;
}
