import { Card, CardInstance, CARD_POOL } from './types';

export class CardDeckManager {
  private deck: CardInstance[] = [];
  private hand: CardInstance[] = [];
  private discard: CardInstance[] = [];
  private readonly maxHandSize: number = 10;
  private instanceCounter: number = 0;

  constructor() {}

  public buildDeck(selectedCardIds: string[]): void {
    this.deck = [];
    this.hand = [];
    this.discard = [];
    this.instanceCounter = 0;

    for (const cardId of selectedCardIds) {
      const card = CARD_POOL.find(c => c.id === cardId);
      if (card) {
        this.deck.push(this.createCardInstance(card));
      }
    }
    this.shuffle();
  }

  private createCardInstance(card: Card): CardInstance {
    this.instanceCounter++;
    return {
      instanceId: `inst_${Date.now()}_${this.instanceCounter}`,
      card: card
    };
  }

  public shuffle(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  public drawCard(count: number = 1): CardInstance[] {
    const drawn: CardInstance[] = [];
    for (let i = 0; i < count; i++) {
      if (this.hand.length >= this.maxHandSize) {
        break;
      }
      if (this.deck.length === 0) {
        if (this.discard.length === 0) {
          break;
        }
        this.deck = [...this.discard];
        this.discard = [];
        this.shuffle();
      }
      const card = this.deck.pop();
      if (card) {
        this.hand.push(card);
        drawn.push(card);
      }
    }
    return drawn;
  }

  public playCard(instanceId: string): CardInstance | null {
    const index = this.hand.findIndex(c => c.instanceId === instanceId);
    if (index === -1) {
      return null;
    }
    const [card] = this.hand.splice(index, 1);
    this.discard.push(card);
    return card;
  }

  public getHand(): CardInstance[] {
    return [...this.hand];
  }

  public getDeckSize(): number {
    return this.deck.length;
  }

  public getDiscardSize(): number {
    return this.discard.length;
  }

  public getHandSize(): number {
    return this.hand.length;
  }

  public generateRandomDeck(size: number = 15): string[] {
    const shuffled = [...CARD_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size).map(c => c.id);
  }
}
