export type Element = 'fire' | 'water' | 'earth' | 'wind' | 'light' | 'dark';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CardData {
  id: number;
  name: string;
  element: Element;
  rarity: Rarity;
  cost: number;
  attack: number;
  health: number;
  is_spell: boolean;
  description: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Creature {
  id: string;
  cardId: number;
  element: Element;
  attack: number;
  health: number;
  maxHealth: number;
  position: Position;
  owner: 'player' | 'enemy';
  hasActed: boolean;
  shakeOffset: Position;
  shakeTime: number;
}

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff4444',
  water: '#4488ff',
  earth: '#88aa44',
  wind: '#88ddcc',
  light: '#ffdd44',
  dark: '#aa44cc'
};

export const ELEMENT_GLOW: Record<Element, string> = {
  fire: 'rgba(255, 68, 68, 0.6)',
  water: 'rgba(68, 136, 255, 0.6)',
  earth: 'rgba(136, 170, 68, 0.6)',
  wind: 'rgba(136, 221, 204, 0.6)',
  light: 'rgba(255, 221, 68, 0.6)',
  dark: 'rgba(170, 68, 204, 0.6)'
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#888888',
  rare: '#4488ff',
  epic: '#aa44cc',
  legendary: '#ffcc00'
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common: 'rgba(136, 136, 136, 0.5)',
  rare: 'rgba(68, 136, 255, 0.5)',
  epic: 'rgba(170, 68, 204, 0.5)',
  legendary: 'rgba(255, 204, 0, 0.5)'
};

export const ELEMENT_SYMBOLS: Record<Element, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🌍',
  wind: '💨',
  light: '✨',
  dark: '🌙'
};
