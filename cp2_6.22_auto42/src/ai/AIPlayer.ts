/**
 * AI决策模块
 * 
 * 职责: AI在自身回合根据手牌的费用与对手状态选择最优卡牌
 * 策略: 先出费用最接近可用法力上限且对对手造成最高伤害的牌
 * 
 * 调用关系:
 * - 依赖: GameEngine (获取游戏状态)、types.ts (卡牌类型)
 * - 被调用: main.ts (当轮到AI回合时)
 * - 调用: GameEngine.playCard() (打出选择的卡牌)
 * 
 * 数据流向:
 * GameEngine (AI回合开始) → main.ts → AIPlayer.takeTurn()
 *   ↓ 评估手牌 selectBestCard()
 *   ↓ 计算卡牌分数 calculateCardScore()
 * 选择最优卡牌 → GameEngine.playCard() → 战斗结算 → 状态更新
 */

import { GameEngine, GameState } from '../engine/GameEngine';
import { CardInstance, CardEffectType } from '../engine/types';

export class AIPlayer {
  private engine: GameEngine;
  private readonly THINKING_DELAY: number = 500;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  public async takeTurn(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.executeTurn();
        resolve();
      }, this.THINKING_DELAY);
    });
  }

  private executeTurn(): void {
    let played: boolean = true;
    let safetyCounter: number = 0;
    const maxPlaysPerTurn: number = 5;

    while (played && safetyCounter < maxPlaysPerTurn) {
      played = false;
      safetyCounter++;
      const state = this.engine.getState();

      if (state.phase !== 'battle' || state.currentTurn !== 'ai') {
        break;
      }

      const bestCard = this.selectBestCard(state);
      if (bestCard) {
        played = this.engine.playCard(bestCard.instanceId, 'ai');
      }
    }

    const finalState = this.engine.getState();
    if (finalState.phase === 'battle' && finalState.currentTurn === 'ai') {
      this.engine.endAiTurn();
    }
  }

  private selectBestCard(state: GameState): CardInstance | null {
    const playableCards = state.aiHand.filter(c => c.card.cost <= state.aiMana);
    if (playableCards.length === 0) {
      return null;
    }

    const scoredCards = playableCards.map(card => ({
      card,
      score: this.calculateCardScore(card, state)
    }));

    scoredCards.sort((a, b) => b.score - a.score);

    return scoredCards[0]?.card || null;
  }

  private calculateCardScore(card: CardInstance, state: GameState): number {
    let score: number = 0;
    const cost = card.card.cost;
    const manaDiff = Math.abs(cost - state.aiMana);
    const costEfficiency = state.aiMana > 0 ? cost / state.aiMana : 0;

    score += costEfficiency * 50;
    score -= manaDiff * 2;

    for (const effect of card.card.effects) {
      score += this.evaluateEffect(effect.type, effect.value, state);
    }

    score += (card.card.rarity === 'legendary' ? 10 : card.card.rarity === 'epic' ? 5 : card.card.rarity === 'rare' ? 2 : 0);

    return score;
  }

  private evaluateEffect(type: CardEffectType, value: number, state: GameState): number {
    switch (type) {
      case 'damage':
        const lethalCheck = value >= state.playerHero.health + state.playerHero.armor;
        if (lethalCheck) {
          return 1000;
        }
        return value * 10;
      case 'heal':
        const missingHealth = state.aiHero.maxHealth - state.aiHero.health;
        const actualHeal = Math.min(missingHealth, value);
        return actualHeal * 6;
      case 'armor':
        return value * 5;
      case 'draw':
        return value * 15;
      default:
        return 0;
    }
  }
}
