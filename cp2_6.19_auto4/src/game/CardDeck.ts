import type { Card, CardType, Player } from '../types/game';

const ATTACK_NAMES = ['烈焰斩', '暗影刺', '雷霆击', '冰霜箭', '烈焰风暴'];
const DEFENSE_NAMES = ['铁壁', '圣光盾', '冰甲', '暗影屏障', '岩石护甲'];
const HEAL_NAMES = ['生命之泉', '圣光治愈', '自然恢复', '能量注入', '疗愈之光'];

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickCardConfig(type: CardType): Omit<Card, 'id'> {
  let name: string;
  let cost: number;
  let value: number;
  let color: string;
  let borderColor: string;
  let icon: string;
  let description: string;

  if (type === 'attack') {
    name = ATTACK_NAMES[randInt(0, ATTACK_NAMES.length - 1)];
    value = randInt(5, 8);
    cost = value >= 7 ? 2 : 1;
    color = '#e94560';
    borderColor = '#ff6b6b';
    icon = '\u2694';
    description = `造成 ${value} 点伤害`;
  } else if (type === 'defense') {
    name = DEFENSE_NAMES[randInt(0, DEFENSE_NAMES.length - 1)];
    value = randInt(3, 5);
    cost = value === 5 ? 2 : 1;
    color = '#0f3460';
    borderColor = '#4a9eff';
    icon = '\u{1F6E1}';
    description = `获得 ${value} 点护甲`;
  } else {
    name = HEAL_NAMES[randInt(0, HEAL_NAMES.length - 1)];
    value = randInt(3, 5);
    cost = value === 5 ? 2 : 1;
    color = '#2d6a4f';
    borderColor = '#52b788';
    icon = '\u2764';
    description = `恢复 ${value} 点生命`;
  }

  return { type, name, cost, value, color, borderColor, icon, description };
}

export class CardDeck {
  static generateStandardDeck(): Card[] {
    const deck: Card[] = [];
    for (let i = 0; i < 12; i++) {
      deck.push({ id: uid(), ...pickCardConfig('attack') });
    }
    for (let i = 0; i < 9; i++) {
      deck.push({ id: uid(), ...pickCardConfig('defense') });
    }
    for (let i = 0; i < 9; i++) {
      deck.push({ id: uid(), ...pickCardConfig('heal') });
    }
    return CardDeck.shuffle(deck);
  }

  static shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  static drawCards(player: Player, n: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < n; i++) {
      if (player.deck.length === 0) {
        if (player.discard.length === 0) break;
        player.deck = CardDeck.shuffle(player.discard);
        player.discard = [];
      }
      const c = player.deck.shift();
      if (c) {
        player.hand.push(c);
        drawn.push(c);
      }
    }
    return drawn;
  }

  static discardCard(player: Player, cardId: string): Card | null {
    const idx = player.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) return null;
    const [c] = player.hand.splice(idx, 1);
    player.discard.push(c);
    return c;
  }

  static discardHand(player: Player): void {
    while (player.hand.length > 0) {
      const c = player.hand.pop();
      if (c) player.discard.push(c);
    }
  }
}
