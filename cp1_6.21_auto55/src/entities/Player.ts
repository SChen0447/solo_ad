import { Card, shuffleDeck, generateRandomDeck } from './Card';

export const MAX_HEALTH = 20;
export const MAX_ENERGY = 10;
export const INITIAL_ENERGY = 3;
export const ENERGY_PER_TURN = 2;
export const MAX_HAND_SIZE = 7;
export const INITIAL_DECK_SIZE = 30;
export const INITIAL_HAND_SIZE = 3;
export const MAX_FIELD_SIZE = 4;

export class Player {
  public name: string;
  public health: number;
  public maxHealth: number;
  public energy: number;
  public maxEnergy: number;
  public deck: Card[];
  public hand: Card[];
  public field: Card[];
  public isAI: boolean;
  public avatar?: Phaser.GameObjects.Container;

  constructor(name: string, isAI: boolean = false) {
    this.name = name;
    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.energy = INITIAL_ENERGY;
    this.maxEnergy = INITIAL_ENERGY;
    this.deck = shuffleDeck(generateRandomDeck());
    this.hand = [];
    this.field = [];
    this.isAI = isAI;
  }

  public drawCard(count: number = 1): Card[] {
    const drawnCards: Card[] = [];
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        break;
      }
      if (this.hand.length >= MAX_HAND_SIZE) {
        const burned = this.deck.shift();
        if (burned) {
          drawnCards.push(burned);
        }
        break;
      }
      const card = this.deck.shift();
      if (card) {
        this.hand.push(card);
        drawnCards.push(card);
      }
    }
    return drawnCards;
  }

  public playCard(cardId: string): Card | null {
    const cardIndex = this.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return null;

    const card = this.hand[cardIndex];
    if (this.energy < card.cost) return null;
    if (this.field.length >= MAX_FIELD_SIZE) return null;

    this.energy -= card.cost;
    this.hand.splice(cardIndex, 1);
    card.canAttack = false;
    card.hasAttacked = false;
    this.field.push(card);

    return card;
  }

  public startTurn(): void {
    this.maxEnergy = Math.min(this.maxEnergy + ENERGY_PER_TURN, MAX_ENERGY);
    this.energy = this.maxEnergy;
    this.drawCard(1);

    for (const card of this.field) {
      card.canAttack = true;
      card.hasAttacked = false;
    }
  }

  public endTurn(): void {
  }

  public takeDamage(damage: number): boolean {
    this.health -= damage;
    return this.health <= 0;
  }

  public heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  public removeCardFromField(cardId: string): Card | null {
    const cardIndex = this.field.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return null;
    const [card] = this.field.splice(cardIndex, 1);
    return card;
  }

  public canAttackWithAny(): boolean {
    return this.field.some(card => card.canAttack && !card.hasAttacked);
  }

  public getAttackableCards(): Card[] {
    return this.field.filter(card => card.canAttack && !card.hasAttacked);
  }

  public getTauntCards(): Card[] {
    return this.field.filter(card => card.effect === 'taunt');
  }

  public reset(): void {
    this.health = MAX_HEALTH;
    this.maxHealth = MAX_HEALTH;
    this.energy = INITIAL_ENERGY;
    this.maxEnergy = INITIAL_ENERGY;
    this.deck = shuffleDeck(generateRandomDeck());
    this.hand = [];
    this.field = [];
  }
}
