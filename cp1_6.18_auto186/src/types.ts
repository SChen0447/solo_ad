export type PieceType = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

export interface PieceData {
  id: string;
  type: PieceType;
  x: number;
  y: number;
  isNew?: boolean;
}

export interface ConnectionData {
  id: string;
  fromId: string;
  toId: string;
  score: number;
  isNew?: boolean;
}

export interface Inventory {
  fire: number;
  water: number;
  wind: number;
  earth: number;
  light: number;
  dark: number;
}

export interface BoardState {
  pieces: PieceData[];
  connections: ConnectionData[];
  inventory: Inventory;
  score: number;
  scoreAnimation: { value: number; key: number } | null;
}

export interface PieceTypeConfig {
  color: string;
  label: string;
  icon: string;
}

export const PIECE_CONFIGS: Record<PieceType, PieceTypeConfig> = {
  fire: { color: '#ef4444', label: '火', icon: '🔥' },
  water: { color: '#3b82f6', label: '水', icon: '💧' },
  wind: { color: '#22c55e', label: '风', icon: '🌪️' },
  earth: { color: '#a16207', label: '土', icon: '⛰️' },
  light: { color: '#eab308', label: '光', icon: '☀️' },
  dark: { color: '#a855f7', label: '暗', icon: '🌙' },
};

export const BOARD_WIDTH = 12;
export const BOARD_HEIGHT = 8;
export const CELL_SIZE = 60;
export const PIECE_SIZE = 40;
export const MINI_VIEW_WIDTH = 150;
export const MINI_VIEW_HEIGHT = 100;
export const MAX_CONNECTIONS_PER_PIECE = 3;
export const INITIAL_PIECE_COUNT = 3;
