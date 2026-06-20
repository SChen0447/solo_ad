export interface UnitType {
  name: string;
  type: string;
  attack: number;
  defense: number;
  movement: number;
  health: number;
  range: number;
  color: string;
}

export interface Unit {
  id: string;
  type: string;
  team: 'player' | 'ai';
  position: HexCoord;
  currentHealth: number;
  maxHealth: number;
  attack: number;
  defense: number;
  movement: number;
  range: number;
  color: string;
  name: string;
  hasMoved: boolean;
  hasAttacked: boolean;
}

export interface HexCoord {
  q: number;
  r: number;
}

export interface Tile {
  coord: HexCoord;
  terrain: 'grass' | 'rock' | 'tree' | 'base_player' | 'base_ai';
}

export interface Base {
  team: 'player' | 'ai';
  position: HexCoord;
  currentHealth: number;
  maxHealth: number;
}

export interface GameState {
  turn: number;
  currentTeam: 'player' | 'ai';
  units: Unit[];
  bases: Base[];
  selectedUnitId: string | null;
  phase: 'select' | 'move' | 'attack' | 'gameOver';
  winner: 'player' | 'ai' | null;
  moveRange: HexCoord[];
  attackRange: HexCoord[];
  pathPreview: HexCoord[];
  gameStartTime: number;
}

export interface GameRecord {
  id: string;
  winner: string;
  turns: number;
  player_units_remaining: number;
  ai_units_remaining: number;
  timestamp: string;
  duration: number;
}

export interface DamagePopup {
  id: string;
  position: HexCoord;
  damage: number;
}
