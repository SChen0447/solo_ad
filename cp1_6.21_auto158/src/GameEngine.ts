import { ICard, IComboRule, SpecialEffect } from './CardSystem';
import { cardSystem } from './CardSystem';

export interface BattleState {
  playerHealth: number;
  playerArmor: number;
  playerEnergy: number;
  maxEnergy: number;
  enemyHealth: number;
  enemyArmor: number;
  currentTurn: 'player' | 'enemy';
  turnNumber: number;
  cardsPlayedThisTurn: number;
  maxCardsPerTurn: number;
  isGameOver: boolean;
  winner: 'player' | 'enemy' | null;
  enemyStatusEffects: StatusEffect[];
  playerStatusEffects: StatusEffect[];
}

export interface StatusEffect {
  type: SpecialEffect;
  duration: number;
  value?: number;
}

export interface PlayCardResult {
  success: boolean;
  damageDealt?: number;
  armorGained?: number;
  healthRestored?: number;
  energyGained?: number;
  comboTriggered?: IComboRule;
  message: string;
  affectedCards?: string[];
}

export interface BattleStats {
  totalTurns: number;
  totalDamageDealt: number;
  totalArmorGained: number;
  comboTriggerCount: number;
  cardUsageCount: Map<string, number>;
  totalCardsPlayed: number;
}

export type GameEventType = 
  | 'stateChanged'
  | 'cardPlayed'
  | 'comboTriggered'
  | 'damageDealt'
  | 'armorGained'
  | 'gameOver'
  | 'turnEnded'
  | 'statsUpdated';

export interface GameEventCallback {
  (event: GameEventType, data?: unknown): void;
}

export class GameEngine {
  private battleState: BattleState;
  private playerHand: ICard[];
  private playerDeck: ICard[];
  private playedCardsThisTurn: string[];
  private stats: BattleStats;
  private eventCallbacks: Set<GameEventCallback>;
  private cardSystemInstance: typeof cardSystem;

  constructor() {
    this.cardSystemInstance = cardSystem;
    this.eventCallbacks = new Set();
    this.battleState = this.createInitialBattleState();
    this.playerHand = [];
    this.playerDeck = [];
    this.playedCardsThisTurn = [];
    this.stats = this.createInitialStats();
  }

  private createInitialBattleState(): BattleState {
    return {
      playerHealth: 100,
      playerArmor: 0,
      playerEnergy: 3,
      maxEnergy: 3,
      enemyHealth: 100,
      enemyArmor: 0,
      currentTurn: 'player',
      turnNumber: 1,
      cardsPlayedThisTurn: 0,
      maxCardsPerTurn: 3,
      isGameOver: false,
      winner: null,
      enemyStatusEffects: [],
      playerStatusEffects: [],
    };
  }

  private createInitialStats(): BattleStats {
    return {
      totalTurns: 0,
      totalDamageDealt: 0,
      totalArmorGained: 0,
      comboTriggerCount: 0,
      cardUsageCount: new Map(),
      totalCardsPlayed: 0,
    };
  }

  on(callback: GameEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  private emit(event: GameEventType, data?: unknown): void {
    this.eventCallbacks.forEach(callback => callback(event, data));
  }

  initializeBattle(selectedCardIds: string[]): void {
    this.battleState = this.createInitialBattleState();
    this.stats = this.createInitialStats();
    this.playedCardsThisTurn = [];

    this.playerDeck = selectedCardIds
      .map(id => this.cardSystemInstance.getCard(id))
      .filter((card): card is ICard => card !== undefined);

    this.drawCards(6);
    this.emit('stateChanged', { ...this.battleState });
    this.emit('statsUpdated', this.getSerializableStats());
  }

  private drawCards(count: number): void {
    for (let i = 0; i < count && this.playerHand.length < 10; i++) {
      if (this.playerDeck.length > 0) {
        const randomIndex = Math.floor(Math.random() * this.playerDeck.length);
        const card = this.playerDeck.splice(randomIndex, 1)[0];
        this.playerHand.push({ ...card });
      }
    }
  }

  getBattleState(): Readonly<BattleState> {
    return { ...this.battleState };
  }

  getPlayerHand(): Readonly<ICard[]> {
    return [...this.playerHand];
  }

  getStats(): Readonly<BattleStats> {
    return { ...this.stats, cardUsageCount: new Map(this.stats.cardUsageCount) };
  }

  getSerializableStats() {
    return {
      totalTurns: this.stats.totalTurns,
      totalDamageDealt: this.stats.totalDamageDealt,
      totalArmorGained: this.stats.totalArmorGained,
      comboTriggerCount: this.stats.comboTriggerCount,
      cardUsageCount: Array.from(this.stats.cardUsageCount.entries()),
      totalCardsPlayed: this.stats.totalCardsPlayed,
      comboTriggerRate: this.stats.totalCardsPlayed > 0 
        ? (this.stats.comboTriggerCount / Math.floor(this.stats.totalCardsPlayed / 2)) * 100 
        : 0,
    };
  }

  playCard(cardIndex: number): PlayCardResult {
    if (this.battleState.isGameOver) {
      return { success: false, message: '游戏已结束' };
    }

    if (this.battleState.currentTurn !== 'player') {
      return { success: false, message: '当前不是你的回合' };
    }

    if (this.battleState.cardsPlayedThisTurn >= this.battleState.maxCardsPerTurn) {
      return { success: false, message: '本回合出牌数已达上限' };
    }

    const card = this.playerHand[cardIndex];
    if (!card) {
      return { success: false, message: '无效的卡牌索引' };
    }

    if (this.battleState.playerEnergy < card.cost) {
      return { success: false, message: '能量不足' };
    }

    this.battleState.playerEnergy -= card.cost;
    this.battleState.cardsPlayedThisTurn++;
    this.playerHand.splice(cardIndex, 1);
    this.playedCardsThisTurn.push(card.id);

    this.stats.totalCardsPlayed++;
    this.stats.cardUsageCount.set(
      card.id, 
      (this.stats.cardUsageCount.get(card.id) || 0) + 1
    );

    const result: PlayCardResult = {
      success: true,
      message: `打出 ${card.name}`,
      affectedCards: [card.id],
    };

    this.executeCardEffect(card, result);

    const combo = this.cardSystemInstance.checkCombo(this.playedCardsThisTurn);
    if (combo) {
      result.comboTriggered = combo;
      result.message = `触发连击: ${combo.name}! ${result.message}`;
      this.executeComboEffect(combo, result);
      this.stats.comboTriggerCount++;
      this.emit('comboTriggered', combo);
    }

    this.checkGameOver();

    this.emit('cardPlayed', { card, result });
    this.emit('stateChanged', { ...this.battleState });
    this.emit('statsUpdated', this.getSerializableStats());

    return result;
  }

  private executeCardEffect(card: ICard, result: PlayCardResult): void {
    if (card.type === 'attack' && card.baseDamage) {
      this.dealDamageToEnemy(card.baseDamage, result);
    } else if (card.type === 'defense' && card.baseArmor) {
      this.addArmorToPlayer(card.baseArmor, result);
    } else if (card.type === 'utility') {
      this.executeUtilityEffect(card, result);
    }
  }

  private executeComboEffect(combo: IComboRule, result: PlayCardResult): void {
    if (combo.extraDamage > 0) {
      this.dealDamageToEnemy(combo.extraDamage, result, true);
    }

    combo.specialEffects.forEach(effect => {
      this.applyStatusEffect('enemy', effect, 1);
    });

    if (combo.extraEffect === '获得护甲') {
      this.addArmorToPlayer(10, result);
    }
  }

  private dealDamageToEnemy(damage: number, result: PlayCardResult, isCombo = false): void {
    let actualDamage = damage;

    if (this.battleState.enemyArmor > 0) {
      if (this.battleState.enemyArmor >= actualDamage) {
        this.battleState.enemyArmor -= actualDamage;
        actualDamage = 0;
      } else {
        actualDamage -= this.battleState.enemyArmor;
        this.battleState.enemyArmor = 0;
      }
    }

    this.battleState.enemyHealth = Math.max(0, this.battleState.enemyHealth - actualDamage);
    this.stats.totalDamageDealt += actualDamage;

    if (isCombo) {
      result.damageDealt = (result.damageDealt || 0) + actualDamage;
    } else {
      result.damageDealt = actualDamage;
    }

    this.emit('damageDealt', { target: 'enemy', amount: actualDamage, isCombo });
  }

  private addArmorToPlayer(armor: number, result: PlayCardResult): void {
    this.battleState.playerArmor += armor;
    this.stats.totalArmorGained += armor;
    result.armorGained = armor;
    this.emit('armorGained', { target: 'player', amount: armor });
  }

  private executeUtilityEffect(card: ICard, result: PlayCardResult): void {
    switch (card.id) {
      case 'heal':
        this.battleState.playerHealth = Math.min(
          100,
          this.battleState.playerHealth + 15
        );
        result.healthRestored = 15;
        break;
      case 'energyboost':
        this.battleState.playerEnergy = Math.min(
          this.battleState.maxEnergy + 2,
          this.battleState.playerEnergy + 2
        );
        result.energyGained = 2;
        break;
      case 'timeout':
        this.applyStatusEffect('enemy', 'freeze', 1);
        break;
    }
  }

  private applyStatusEffect(target: 'player' | 'enemy', type: SpecialEffect, duration: number): void {
    const effects = target === 'player' 
      ? this.battleState.playerStatusEffects 
      : this.battleState.enemyStatusEffects;

    const existing = effects.find(e => e.type === type);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
    } else {
      effects.push({ type, duration });
    }
  }

  private processStatusEffects(target: 'player' | 'enemy'): void {
    const effects = target === 'player'
      ? this.battleState.playerStatusEffects
      : this.battleState.enemyStatusEffects;

    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      effect.duration--;
      if (effect.duration <= 0) {
        effects.splice(i, 1);
      }
    }
  }

  private isEnemyFrozen(): boolean {
    return this.battleState.enemyStatusEffects.some(e => e.type === 'freeze');
  }

  endTurn(): void {
    if (this.battleState.isGameOver) return;

    this.processStatusEffects('player');
    this.playedCardsThisTurn = [];

    this.battleState.currentTurn = 'enemy';
    this.emit('stateChanged', { ...this.battleState });

    setTimeout(() => {
      this.executeEnemyTurn();
    }, 800);
  }

  private executeEnemyTurn(): void {
    if (this.isEnemyFrozen()) {
      this.processStatusEffects('enemy');
      this.startPlayerTurn();
      return;
    }

    const enemyDamage = Math.floor(Math.random() * 15) + 5;
    let actualDamage = enemyDamage;

    if (this.battleState.playerArmor > 0) {
      if (this.battleState.playerArmor >= actualDamage) {
        this.battleState.playerArmor -= actualDamage;
        actualDamage = 0;
      } else {
        actualDamage -= this.battleState.playerArmor;
        this.battleState.playerArmor = 0;
      }
    }

    this.battleState.playerHealth = Math.max(0, this.battleState.playerHealth - actualDamage);
    this.emit('damageDealt', { target: 'player', amount: actualDamage });

    this.processStatusEffects('enemy');
    this.checkGameOver();

    if (!this.battleState.isGameOver) {
      this.startPlayerTurn();
    }
  }

  private startPlayerTurn(): void {
    this.battleState.currentTurn = 'player';
    this.battleState.turnNumber++;
    this.battleState.cardsPlayedThisTurn = 0;
    this.battleState.playerEnergy = this.battleState.maxEnergy;
    this.stats.totalTurns++;

    this.drawCards(1);

    this.emit('turnEnded');
    this.emit('stateChanged', { ...this.battleState });
    this.emit('statsUpdated', this.getSerializableStats());
  }

  private checkGameOver(): void {
    if (this.battleState.playerHealth <= 0) {
      this.battleState.isGameOver = true;
      this.battleState.winner = 'enemy';
      this.emit('gameOver', { winner: 'enemy' });
    } else if (this.battleState.enemyHealth <= 0) {
      this.battleState.isGameOver = true;
      this.battleState.winner = 'player';
      this.emit('gameOver', { winner: 'player' });
    }
  }

  addCardToHand(cardId: string): boolean {
    const card = this.cardSystemInstance.getCard(cardId);
    if (!card) return false;
    this.playerHand.push({ ...card });
    return true;
  }

  removeCardFromHand(index: number): ICard | null {
    if (index < 0 || index >= this.playerHand.length) return null;
    return this.playerHand.splice(index, 1)[0];
  }
}

export const gameEngine = new GameEngine();
