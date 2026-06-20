export type CardType = 'occupy' | 'fortify' | 'move' | 'block' | 'lightning';

export interface Card {
  id: string;
  type: CardType;
}

export const CARD_INFO: Record<CardType, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  occupy: {
    name: '占领',
    description: '占领一个相邻空格，建立新领地',
    icon: '🏰',
    color: '#e74c3c',
  },
  fortify: {
    name: '强化',
    description: '提升己方领地耐久度（最多3层）',
    icon: '🛡️',
    color: '#3498db',
  },
  move: {
    name: '移动',
    description: '将己方领地转移至相邻空格',
    icon: '⚔️',
    color: '#2ecc71',
  },
  block: {
    name: '封锁',
    description: '使对方领地本回合不可用',
    icon: '⛓️',
    color: '#9b59b6',
  },
  lightning: {
    name: '闪电',
    description: '直接夺取对方一个领地（耐久>1则减1层）',
    icon: '⚡',
    color: '#f1c40f',
  },
};

export const MAX_HAND_SIZE = 7;
export const DRAW_PER_TURN = 3;
export const PLAY_PER_TURN = 2;
export const BOARD_SIZE = 10;
export const VICTORY_PERCENT = 0.6;

export const PLAYER_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
];

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const CARD_WEIGHTS: [CardType, number][] = [
  ['occupy', 40],
  ['fortify', 20],
  ['move', 15],
  ['block', 15],
  ['lightning', 10],
];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const [type, count] of CARD_WEIGHTS) {
    for (let i = 0; i < count; i++) {
      deck.push({
        id: generateId(),
        type,
      });
    }
  }
  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function drawCards(
  deck: Card[],
  discardPile: Card[],
  hand: Card[],
  count: number,
): { deck: Card[]; discardPile: Card[]; hand: Card[] } {
  let newDeck = [...deck];
  let newDiscard = [...discardPile];
  let newHand = [...hand];

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      if (newDiscard.length === 0) break;
      newDeck = shuffle(newDiscard);
      newDiscard = [];
    }
    if (newHand.length >= MAX_HAND_SIZE) {
      const idx = Math.floor(Math.random() * newHand.length);
      newDiscard.push(newHand[idx]);
      newHand.splice(idx, 1);
    }
    const card = newDeck.shift();
    if (card) newHand.push(card);
  }

  return { deck: newDeck, discardPile: newDiscard, hand: newHand };
}

export function getNeighbors(q: number, r: number): [number, number][] {
  const dirs: [number, number][] = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, -1], [-1, 1],
  ];
  return dirs
    .map(([dq, dr]) => [q + dq, r + dr] as [number, number])
    .filter(([nq, nr]) => nq >= 0 && nq < BOARD_SIZE && nr >= 0 && nr < BOARD_SIZE);
}
