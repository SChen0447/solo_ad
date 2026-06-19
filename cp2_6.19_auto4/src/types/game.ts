export type CardType = 'attack' | 'defense' | 'heal';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  energyCost: number;
  value: number;
  color: string;
  borderColor: string;
  icon: string;
  description: string;
}

export interface Player {
  hp: number;
  maxHp: number;
  armor: number;
  energy: number;
  maxEnergy: number;
  hand: Card[];
  deck: Card[];
  discard: Card[];
}

export type TurnPhase =
  | 'player_draw'
  | 'player_action'
  | 'player_end'
  | 'ai_draw'
  | 'ai_action'
  | 'ai_end';

export type GamePhase = 'playing' | 'victory' | 'defeat';

export interface AnimationEvent {
  type: 'card_play' | 'damage' | 'heal' | 'shield' | 'turn_switch';
  from?: 'player' | 'ai';
  to?: 'player' | 'ai';
  card?: Card;
  value?: number;
  duration: number;
  startTime: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface GameState {
  turn: number;
  currentPlayer: 'player' | 'ai';
  phase: GamePhase;
  turnPhase: TurnPhase;
  player: Player;
  ai: Player;
  animations: AnimationEvent[];
  floatingTexts: FloatingText[];
  battlefieldCard?: Card;
  battlefieldCardStartTime?: number;
  message?: string;
  messageStartTime?: number;
  messageDuration?: number;
  aiFlashEndTime?: number;
  playerFlashEndTime?: number;
  restartBtnRect?: { x: number; y: number; w: number; h: number };
  endTurnBtnRect?: { x: number; y: number; w: number; h: number };
  gameOver: boolean;
}

export interface CardRect {
  cardId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
