export type ElementType = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

export type SkillType = 'combo' | 'shield' | 'pierce' | 'heal' | 'taunt' | 'dodge';

export interface CardData {
  id: string;
  name: string;
  element: ElementType;
  attack: number;
  defense: number;
  skill: SkillType;
  skillName: string;
  skillDesc: string;
}

export interface PlacedCard extends CardData {
  position: number;
  ownerId: string;
  hasAttacked: boolean;
  skillUsed: boolean;
  effectiveAttack: number;
  effectiveDefense: number;
}

export interface PlayerState {
  id: string;
  nickname: string;
  hp: number;
  maxHp: number;
  hand: CardData[];
  deck: CardData[];
  field: (PlacedCard | null)[];
  socketId: string;
  isConnected: boolean;
  disconnectedAt?: number;
}

export type BattlePhase = 'playing' | 'ended';

export interface BattleState {
  roomId: string;
  players: Record<string, PlayerState>;
  playerIds: [string, string];
  currentTurnPlayerId: string;
  turnNumber: number;
  phase: BattlePhase;
  winnerId: string | null;
  startedAt: number;
  lastActionAt: number;
}

export interface MatchRecord {
  id: string;
  player1Name: string;
  player2Name: string;
  winnerName: string;
  durationMs: number;
  turnCount: number;
  endedAt: number;
}

export interface MatchStartPayload {
  roomId: string;
  playerId: string;
  opponent: { id: string; nickname: string };
  initialHand: CardData[];
  deck: CardData[];
  state: BattleState;
}

export interface PlayCardPayload {
  cardId: string;
  position: number;
}

export interface BattleActionResult {
  state: BattleState;
  events: BattleEvent[];
}

export type BattleEventType =
  | 'card_placed'
  | 'damage_dealt'
  | 'skill_triggered'
  | 'turn_ended'
  | 'battle_ended'
  | 'card_destroyed'
  | 'heal_done';

export interface BattleEvent {
  type: BattleEventType;
  message: string;
  playerId?: string;
  card?: CardData;
  damage?: number;
  bannerColor?: 'danger' | 'success' | 'info';
}

export type SocketClientEvents = {
  'start-match': (nickname: string) => void;
  'cancel-match': () => void;
  'play-card': (payload: PlayCardPayload) => void;
  'end-turn': () => void;
  'get-records': () => void;
  'reconnect': (roomId: string, playerId: string) => void;
};

export type SocketServerEvents = {
  'match-queued': () => void;
  'match-cancelled': () => void;
  'match-start': (payload: MatchStartPayload) => void;
  'state-update': (state: BattleState, events: BattleEvent[]) => void;
  'records-update': (records: MatchRecord[]) => void;
  'error': (message: string) => void;
  'opponent-disconnected': () => void;
  'opponent-reconnected': () => void;
  'reconnect-success': (payload: MatchStartPayload) => void;
  'reconnect-failed': () => void;
};
