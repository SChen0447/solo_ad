export type CardType = 'attack' | 'defense' | 'utility';
export type Rarity = 'common' | 'rare' | 'epic';
export type SpecialEffect = 'freeze' | 'burn' | 'stun' | 'heal' | 'draw' | 'energy';

export interface ICard {
  id: string;
  name: string;
  type: CardType;
  cost: number;
  baseDamage?: number;
  baseArmor?: number;
  effects: string[];
  rarity: Rarity;
  modified: boolean;
  icon: string;
  originalCost: number;
  originalDamage?: number;
  originalArmor?: number;
}

export interface IComboRule {
  id: string;
  name: string;
  triggerCardIds: string[];
  resultDescription: string;
  extraDamage: number;
  extraEffect: string;
  specialEffects: SpecialEffect[];
}

export class CardSystem {
  private cards: Map<string, ICard>;
  private comboRules: Map<string, IComboRule>;

  constructor() {
    this.cards = new Map();
    this.comboRules = new Map();
    this.initializeCards();
    this.initializeComboRules();
  }

  private initializeCards(): void {
    const presetCards: ICard[] = [
      { id: 'fireball', name: '火球术', type: 'attack', cost: 2, baseDamage: 15, effects: ['造成火焰伤害'], rarity: 'common', modified: false, icon: '🔥', originalCost: 2, originalDamage: 15 },
      { id: 'icestorm', name: '冰风暴', type: 'attack', cost: 3, baseDamage: 20, effects: ['造成冰霜伤害'], rarity: 'rare', modified: false, icon: '❄️', originalCost: 3, originalDamage: 20 },
      { id: 'lightning', name: '闪电链', type: 'attack', cost: 2, baseDamage: 18, effects: ['连锁闪电'], rarity: 'rare', modified: false, icon: '⚡', originalCost: 2, originalDamage: 18 },
      { id: 'slash', name: '斩击', type: 'attack', cost: 1, baseDamage: 8, effects: ['快速攻击'], rarity: 'common', modified: false, icon: '⚔️', originalCost: 1, originalDamage: 8 },
      { id: 'meteor', name: '陨石术', type: 'attack', cost: 3, baseDamage: 25, effects: ['毁灭打击'], rarity: 'epic', modified: false, icon: '☄️', originalCost: 3, originalDamage: 25 },
      { id: 'arrow', name: '穿透箭', type: 'attack', cost: 1, baseDamage: 10, effects: ['穿透护甲'], rarity: 'common', modified: false, icon: '🏹', originalCost: 1, originalDamage: 10 },
      { id: 'shield', name: '护盾术', type: 'defense', cost: 1, baseArmor: 10, effects: ['获得护甲'], rarity: 'common', modified: false, icon: '🛡️', originalCost: 1, originalArmor: 10 },
      { id: 'ironwall', name: '铁壁', type: 'defense', cost: 2, baseArmor: 18, effects: ['大量护甲'], rarity: 'rare', modified: false, icon: '🏰', originalCost: 2, originalArmor: 18 },
      { id: 'barrier', name: '魔法屏障', type: 'defense', cost: 3, baseArmor: 25, effects: ['无敌护盾'], rarity: 'epic', modified: false, icon: '✨', originalCost: 3, originalArmor: 25 },
      { id: 'heal', name: '治疗术', type: 'utility', cost: 2, effects: ['恢复15点生命'], rarity: 'common', modified: false, icon: '💚', originalCost: 2 },
      { id: 'energyboost', name: '能量涌动', type: 'utility', cost: 0, effects: ['获得2点能量'], rarity: 'rare', modified: false, icon: '⚡', originalCost: 0 },
      { id: 'timeout', name: '时间停止', type: 'utility', cost: 3, effects: ['冻结对手一回合'], rarity: 'epic', modified: false, icon: '⏱️', originalCost: 3 },
    ];

    presetCards.forEach(card => this.cards.set(card.id, card));
  }

  private initializeComboRules(): void {
    const presets: IComboRule[] = [
      {
        id: 'freezeburn',
        name: '灼烧冰冻',
        triggerCardIds: ['fireball', 'icestorm'],
        resultDescription: '额外造成10点伤害并冻结对手一回合',
        extraDamage: 10,
        extraEffect: '冻结',
        specialEffects: ['freeze', 'burn']
      },
      {
        id: 'thunderstrike',
        name: '雷霆一击',
        triggerCardIds: ['lightning', 'slash'],
        resultDescription: '额外造成12点伤害并眩晕',
        extraDamage: 12,
        extraEffect: '眩晕',
        specialEffects: ['stun']
      },
      {
        id: 'meteorshield',
        name: '攻防一体',
        triggerCardIds: ['meteor', 'shield'],
        resultDescription: '造成伤害的同时获得10点护甲',
        extraDamage: 5,
        extraEffect: '获得护甲',
        specialEffects: []
      },
      {
        id: 'arrowstorm',
        name: '箭雨风暴',
        triggerCardIds: ['arrow', 'icestorm'],
        resultDescription: '额外造成8点伤害并减速',
        extraDamage: 8,
        extraEffect: '减速',
        specialEffects: ['freeze']
      }
    ];

    presets.forEach(rule => this.comboRules.set(rule.id, rule));
  }

  getAllCards(): ICard[] {
    return Array.from(this.cards.values());
  }

  getCard(id: string): ICard | undefined {
    return this.cards.get(id);
  }

  modifyCardValue(cardId: string, field: 'damage' | 'armor' | 'cost', delta: number): boolean {
    const card = this.cards.get(cardId);
    if (!card) return false;

    if (field === 'damage' && card.baseDamage !== undefined) {
      card.baseDamage = Math.max(0, card.baseDamage + delta);
      card.modified = true;
    } else if (field === 'armor' && card.baseArmor !== undefined) {
      card.baseArmor = Math.max(0, card.baseArmor + delta);
      card.modified = true;
    } else if (field === 'cost') {
      card.cost = Math.max(0, Math.min(10, card.cost + delta));
      card.modified = true;
    }

    return true;
  }

  resetCard(cardId: string): boolean {
    const card = this.cards.get(cardId);
    if (!card) return false;

    card.cost = card.originalCost;
    if (card.originalDamage !== undefined) card.baseDamage = card.originalDamage;
    if (card.originalArmor !== undefined) card.baseArmor = card.originalArmor;
    card.modified = false;

    return true;
  }

  getAllComboRules(): IComboRule[] {
    return Array.from(this.comboRules.values());
  }

  addComboRule(rule: Omit<IComboRule, 'id'>): string {
    const id = `combo_${Date.now()}`;
    this.comboRules.set(id, { ...rule, id });
    return id;
  }

  removeComboRule(ruleId: string): boolean {
    return this.comboRules.delete(ruleId);
  }

  checkCombo(playedCardIds: string[]): IComboRule | null {
    for (const rule of this.comboRules.values()) {
      const hasAll = rule.triggerCardIds.every(id => playedCardIds.includes(id));
      if (hasAll && rule.triggerCardIds.length === playedCardIds.length) {
        return rule;
      }
    }
    return null;
  }

  getSerializableCards(): ICard[] {
    return this.getAllCards().map(card => ({ ...card }));
  }

  validateCard(card: ICard): boolean {
    if (card.cost < 0 || card.cost > 10) return false;
    if (card.baseDamage !== undefined && card.baseDamage < 0) return false;
    if (card.baseArmor !== undefined && card.baseArmor < 0) return false;
    return true;
  }
}

export const cardSystem = new CardSystem();
