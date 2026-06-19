export type CardType = 'attack' | 'defense' | 'heal';

export interface CardConfig {
  energyCost: number;
  color: string;
  borderColor: string;
  icon: string;
  valueRange: [number, number];
  names: string[];
  descriptionTemplate: (value: number) => string;
}

export const CARD_CONFIGS: Readonly<Record<CardType, CardConfig>> = {
  attack: {
    energyCost: 2,
    color: '#e94560',
    borderColor: '#ff6b6b',
    icon: '\u2694',
    valueRange: [5, 8],
    names: ['烈焰斩', '暗影刺', '雷霆击', '冰霜箭', '烈焰风暴'],
    descriptionTemplate: (v) => `造成 ${v} 点伤害`,
  },
  defense: {
    energyCost: 1,
    color: '#0f3460',
    borderColor: '#4a9eff',
    icon: '\u{1F6E1}',
    valueRange: [3, 5],
    names: ['铁壁', '圣光盾', '冰甲', '暗影屏障', '岩石护甲'],
    descriptionTemplate: (v) => `获得 ${v} 点护甲`,
  },
  heal: {
    energyCost: 1,
    color: '#2d6a4f',
    borderColor: '#52b788',
    icon: '\u2764',
    valueRange: [3, 5],
    names: ['生命之泉', '圣光治愈', '自然恢复', '能量注入', '疗愈之光'],
    descriptionTemplate: (v) => `恢复 ${v} 点生命`,
  },
};

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
