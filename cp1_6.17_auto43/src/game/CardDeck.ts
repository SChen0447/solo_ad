export type CardType = 'attack' | 'defense' | 'heal' | 'special';
export type SpecialType = 'draw' | 'discard';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  value: number;
  cost: number;
  specialType?: SpecialType;
}

const attackNames = ['火焰斩', '冰霜刺', '闪电击', '暗影刃', '破甲击', '风暴之拳', '穿刺矛'];
const defenseNames = ['能量护盾', '冰霜护甲', '神圣守护', '反射壁', '铁壁防御', '魔法屏障'];
const healNames = ['生命汲取', '治愈之光', '再生术', '自然祝福', '神圣治愈', '生命之泉'];
const drawNames = ['智慧之眼', '知识探索', '命运抽取', '灵感迸发', '命运之轮'];
const discardNames = ['混乱风暴', '思维扰乱', '丢弃诅咒', '虚空抽取', '混沌之触'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function generateCard(cardId?: string): Card {
  const types: CardType[] = ['attack', 'defense', 'heal', 'special'];
  const type = randomChoice(types);
  
  const card: Card = {
    id: cardId || generateId(),
    type,
    name: '',
    description: '',
    value: 0,
    cost: 1
  };
  
  switch (type) {
    case 'attack':
      card.name = randomChoice(attackNames);
      card.value = Math.floor(Math.random() * 11) + 5;
      card.description = `造成 ${card.value} 点伤害`;
      card.cost = Math.floor(Math.random() * 2) + 1;
      break;
    case 'defense':
      card.name = randomChoice(defenseNames);
      card.value = 50;
      card.description = '减少50%伤害';
      card.cost = 1;
      break;
    case 'heal':
      card.name = randomChoice(healNames);
      card.value = Math.floor(Math.random() * 11) + 10;
      card.description = `恢复 ${card.value} 点生命`;
      card.cost = Math.floor(Math.random() * 2) + 1;
      break;
    case 'special':
      const isDraw = Math.random() > 0.5;
      if (isDraw) {
        card.name = randomChoice(drawNames);
        card.value = 2;
        card.description = `抽 ${card.value} 张牌`;
        card.specialType = 'draw';
      } else {
        card.name = randomChoice(discardNames);
        card.value = 1;
        card.description = '对方随机弃1张牌';
        card.specialType = 'discard';
      }
      card.cost = 2;
      break;
  }
  
  return card;
}

export function generateDeck(count: number = 20): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < count; i++) {
    deck.push(generateCard());
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(deck: Card[], hand: Card[], count: number, maxHandSize: number = 8): { deck: Card[]; hand: Card[]; drawn: Card[] } {
  const newDeck = [...deck];
  const newHand = [...hand];
  const drawn: Card[] = [];
  
  for (let i = 0; i < count; i++) {
    if (newHand.length >= maxHandSize) break;
    if (newDeck.length === 0) {
      const freshDeck = generateDeck(10);
      newDeck.push(...freshDeck);
    }
    const card = newDeck.shift();
    if (card) {
      newHand.push(card);
      drawn.push(card);
    }
  }
  
  return { deck: newDeck, hand: newHand, drawn };
}

export function getCardBorderColor(type: CardType): string {
  switch (type) {
    case 'attack': return '#FF4C4C';
    case 'defense': return '#4CAF50';
    case 'heal': return '#00C853';
    case 'special': return '#9C27B0';
    default: return '#888';
  }
}
