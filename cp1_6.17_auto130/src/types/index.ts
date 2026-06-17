export type ElementType = 'fire' | 'water' | 'earth' | 'wind';

export type FusionType = 'steam' | 'lava' | 'smoke' | 'mud' | 'mist' | 'sand';

export type ResourceType = 'wood' | 'ore' | 'crystal';

export interface Totem {
  id: string;
  type: ElementType | FusionType;
  elements?: ElementType[];
  level: number;
  exp: number;
  isRare?: boolean;
  ability?: string;
  color?: string;
}

export interface Resource {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
  collected: boolean;
}

export interface Room {
  id: string;
  row: number;
  col: number;
  totemSequence: ElementType[];
  clueColors: string[];
  resources: Resource[];
  cleared: boolean;
  doorOpen: boolean;
  activationSlots: (ElementType | null)[];
  activationIndex: number;
}

export interface PlayerPosition {
  row: number;
  col: number;
}

export interface Resources {
  wood: number;
  ore: number;
  crystal: number;
}

export interface GameState {
  playerPos: PlayerPosition;
  totems: Totem[];
  resources: Resources;
  rooms: Record<string, Room>;
  clearedRooms: string[];
  clearedLines: ClearedLine[];
  seed: number;
  selectedTotemId: string | null;
  isAnimating: boolean;
  showSaveMenu: boolean;
  currentView: 'menu' | 'game' | 'saves';
}

export interface ClearedLine {
  type: 'row' | 'col' | 'diag1' | 'diag2';
  index: number;
  rooms: string[];
}

export interface SaveData {
  id: number;
  slot: number;
  playerPos: PlayerPosition;
  totems: Totem[];
  resources: Resources;
  clearedRooms: string[];
  roomConfig: Record<string, Room>;
  seed: number;
  updatedAt: string;
}

export const ELEMENT_COLORS: Record<ElementType, [string, string]> = {
  fire: ['#FF4500', '#FF6347'],
  water: ['#1E90FF', '#00BFFF'],
  earth: ['#8B4513', '#D2691E'],
  wind: ['#32CD32', '#00FA9A'],
};

export const FUSION_COLORS: Record<FusionType, [string, string]> = {
  steam: ['#9370DB', '#DDA0DD'],
  lava: ['#FF4500', '#FFD700'],
  smoke: ['#696969', '#A9A9A9'],
  mud: ['#8B4513', '#A0522D'],
  mist: ['#E0FFFF', '#B0C4DE'],
  sand: ['#F4A460', '#DEB887'],
};

export const ELEMENT_SYMBOLS: Record<ElementType, string> = {
  fire: '🔥',
  water: '💧',
  earth: '🌍',
  wind: '🌪️',
};

export const RESOURCE_ICONS: Record<ResourceType, string> = {
  wood: '🪵',
  ore: '⛏️',
  crystal: '💎',
};

export const MAX_TOTEMS = 8;
export const GRID_SIZE = 3;
