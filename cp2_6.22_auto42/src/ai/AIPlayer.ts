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
