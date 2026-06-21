export interface Position {
  x: number;
  y: number;
}

export interface Wall {
  x: number;
  y: number;
}

export interface Chest {
  x: number;
  y: number;
  opened?: boolean;
}

export interface MapData {
  gridSize: number;
  cellSize: number;
  walls: Wall[];
  chests: Chest[];
  playerStart: Position;
}

export type CardType = 'move' | 'melee' | 'ranged' | 'fire' | 'heal';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  range: number;
  damage: number;
  description: string;
  icon: string;
  blastRadius?: number;
  uid?: string;
}

export type WeaknessType = 'physical' | 'fire' | 'ranged';

export interface Monster {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  x: number;
  y: number;
  weakness: WeaknessType;
  resistance: WeaknessType;
  color: string;
  description: string;
  hitFlashTimer?: number;
  isDead?: boolean;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  moveAnimProgress?: number;
  moveAnimFrom?: Position;
  moveAnimTo?: Position;
  hitFlashTimer?: number;
}

export interface HighlightCell {
  x: number;
  y: number;
  valid: boolean;
}

export interface Effect {
  type: 'slash' | 'arrow' | 'fireball' | 'explosion' | 'heal' | 'hit' | 'move' | 'chestOpen';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  progress: number;
  duration: number;
  data?: any;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  progress: number;
  duration: number;
}
