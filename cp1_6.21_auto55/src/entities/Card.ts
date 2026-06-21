import { v4 as uuidv4 } from 'uuid';

export enum CardEffect {
  NONE = 'none',
  TAUNT = 'taunt',
  CHARGE = 'charge',
  SHIELD = 'shield',
  LIFESTEAL = 'lifesteal'
}

export interface CardData {
  id: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
  maxHealth: number;
  effect: CardEffect;
  description: string;
}

export class Card {
  public id: string;
  public name: string;
  public cost: number;
  public attack: number;
  public health: number;
  public maxHealth: number;
  public effect: CardEffect;
  public description: string;
  public canAttack: boolean = false;
  public hasAttacked: boolean = false;
  public sprite?: Phaser.GameObjects.Container;

  constructor(data: Omit<CardData, 'id' | 'maxHealth'> & { maxHealth?: number }) {
    this.id = uuidv4();
    this.name = data.name;
    this.cost = data.cost;
    this.attack = data.attack;
    this.health = data.health;
    this.maxHealth = data.maxHealth ?? data.health;
    this.effect = data.effect;
    this.description = data.description;
  }

  public takeDamage(damage: number): boolean {
    this.health -= damage;
    return this.health <= 0;
  }

  public heal(amount: number): void {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  public clone(): Card {
    return new Card({
      name: this.name,
      cost: this.cost,
      attack: this.attack,
      health: this.health,
      maxHealth: this.maxHealth,
      effect: this.effect,
      description: this.description
    });
  }

  public getCardColor(): number {
    switch (this.cost) {
      case 1: return 0x4caf50;
      case 2: return 0x2196f3;
      case 3: return 0x9c27b0;
      default: return 0x455a64;
    }
  }

  public getCardColorHex(): string {
    switch (this.cost) {
      case 1: return '#4caf50';
      case 2: return '#2196f3';
      case 3: return '#9c27b0';
      default: return '#455a64';
    }
  }
}

export const baseCardTemplates: Omit<CardData, 'id'>[] = [
  {
    name: '新兵',
    cost: 1,
    attack: 1,
    health: 2,
    maxHealth: 2,
    effect: CardEffect.NONE,
    description: '一个普通的新兵'
  },
  {
    name: '斥候',
    cost: 1,
    attack: 2,
    health: 1,
    maxHealth: 1,
    effect: CardEffect.NONE,
    description: '快速的斥候'
  },
  {
    name: '战士',
    cost: 2,
    attack: 2,
    health: 3,
    maxHealth: 3,
    effect: CardEffect.NONE,
    description: '经验丰富的战士'
  },
  {
    name: '骑士',
    cost: 2,
    attack: 3,
    health: 2,
    maxHealth: 2,
    effect: CardEffect.NONE,
    description: '冲锋陷阵的骑士'
  },
  {
    name: '重装卫士',
    cost: 3,
    attack: 3,
    health: 5,
    maxHealth: 5,
    effect: CardEffect.TAUNT,
    description: '嘲讽：敌方必须先攻击它'
  }
];

export function generateRandomDeck(): Card[] {
  const deck: Card[] = [];
  for (const template of baseCardTemplates) {
    for (let i = 0; i < 6; i++) {
      deck.push(new Card({
        name: template.name,
        cost: template.cost,
        attack: template.attack,
        health: template.health,
        maxHealth: template.maxHealth,
        effect: template.effect,
        description: template.description
      }));
    }
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
