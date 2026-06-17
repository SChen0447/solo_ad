export type RuneType = 'fire' | 'ice' | 'thunder' | 'shadow' | 'light' | 'nature';

export type CardType = 'spell' | 'creature';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Card {
  uid: string;
  instance_id: string;
  id: string;
  name: string;
  type: CardType;
  cost: number;
  element: RuneType;
  rarity: Rarity;
  description: string;
  damage?: number;
  heal?: number;
  freeze?: boolean;
  freeze_all?: boolean;
  target_all?: boolean;
  chain_count?: number;
  destroy_creature?: boolean;
  buff_all?: boolean;
  attack?: number;
  health?: number;
}

export interface CreatureOnBoard {
  instance_id: string;
  card_id: string;
  name: string;
  attack: number;
  health: number;
  max_health: number;
  element: RuneType;
  rarity: Rarity;
  frozen: boolean;
  position: { row: number; col: number };
  owner: 'player' | 'enemy';
  can_attack: boolean;
}

export interface Hero {
  runes: RuneType[];
  attack: number;
  defense: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  mana_per_turn: number;
}

export interface BattlefieldCell {
  row: number;
  col: number;
  creature: CreatureOnBoard | null;
  frozen: boolean;
  highlight: boolean;
}

export interface PlayerState {
  hero: Hero;
  deck: Card[];
  hand: Card[];
  discard_pile: Card[];
  battlefield: BattlefieldCell[][];
}

export interface BattleState {
  turn: number;
  current_player: 'player' | 'enemy';
  phase: 'rune_select' | 'battle' | 'ended';
  player: PlayerState;
  enemy: PlayerState;
  winner: 'player' | 'enemy' | null;
  turn_time_left: number;
  max_turn_time: number;
  event_log: BattleEvent[];
}

export type BattleEventType = 
  | 'card_drawn'
  | 'card_played'
  | 'damage_dealt'
  | 'heal_performed'
  | 'creature_summoned'
  | 'creature_died'
  | 'creature_attacked'
  | 'turn_start'
  | 'turn_end'
  | 'game_end'
  | 'hero_attacked'
  | 'cell_frozen'
  | 'spell_cast';

export interface BattleEvent {
  type: BattleEventType;
  data: Record<string, unknown>;
  timestamp: number;
}

export type ActionType = 
  | 'draw_card'
  | 'play_card'
  | 'end_turn'
  | 'attack'
  | 'select_runes';

export interface PlayerAction {
  type: ActionType;
  player: 'player' | 'enemy';
  payload: Record<string, unknown>;
}

export const RUNE_EFFECTS: Record<RuneType, { attack: number; defense: number; health: number; mana: number }> = {
  fire: { attack: 3, defense: 1, health: 5, mana: 2 },
  ice: { attack: 1, defense: 3, health: 8, mana: 2 },
  thunder: { attack: 4, defense: 0, health: 3, mana: 3 },
  shadow: { attack: 2, defense: 2, health: 4, mana: 3 },
  light: { attack: 2, defense: 2, health: 10, mana: 1 },
  nature: { attack: 2, defense: 3, health: 7, mana: 2 }
};

export const RUNE_COUNTERS: Record<RuneType, RuneType> = {
  fire: 'nature',
  nature: 'thunder',
  thunder: 'ice',
  ice: 'fire',
  light: 'shadow',
  shadow: 'light'
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#ffffff',
  rare: '#4a9eff',
  epic: '#a855f7',
  legendary: '#f59e0b'
};

export const ELEMENT_COLORS: Record<RuneType, string> = {
  fire: '#ef4444',
  ice: '#38bdf8',
  thunder: '#facc15',
  shadow: '#6b21a8',
  light: '#fef3c7',
  nature: '#22c55e'
};
