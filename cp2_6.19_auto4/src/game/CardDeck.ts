import type { Card, CardType, Player } from '../types/game';
import { CARD_CONFIGS } from '../types/game';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickCardConfig(type: CardType): Omit<Card, 'id'> {
  const config = CARD_CONFIGS[type];
  const names = config.names;
  const name = names[randInt(0, names.length - 1)];
  const [minVal, maxVal] = config.valueRange;
  const value = randInt(minVal, maxVal);

  return {
    type,
    name,
    energyCost: config.energyCost,
    value,
    color: config.color,
    borderColor: config.borderColor,
    icon: config.icon,
    description: config.descriptionTemplate(value),
  };
}

const DECK_COMPOSITION: Readonly<Record<CardType, number>> = {
  attack: 12,
  defense: 9,
  heal: 9,
};

export class CardDeck {
  static generateStandardDeck(): Card[] {
    const deck: Card[] = [];
    const types = Object.keys(DECK_COMPOSITION) as CardType[];
    for (const type of types) {
      const count = DECK_COMPOSITION[type];
      for (let i = 0; i < count; i++) {
        deck.push({ id: uid(), ...pickCardConfig(type) });
      }
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
