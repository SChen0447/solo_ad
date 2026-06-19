import type { Card, GameState } from '../types/game';

export class AIPlayer {
  static getAction(state: GameState): string | 'end_turn' {
    const ai = state.ai;
    const player = state.player;
    const playable: Card[] = ai.hand.filter((c) => c.energyCost <= ai.energy);

    if (playable.length === 0) return 'end_turn';

    const scored = playable.map((card) => {
      const score = AIPlayer.evaluateCard(card, ai.hp, ai.armor, player.hp, player.armor);
      return { card, score };
    });
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best.score <= 0 && ai.energy >= 1) {
      return best.card.id;
    }
    return best.card.id;
  }

  private static evaluateCard(
    card: Card,
    aiHp: number,
    aiArmor: number,
    playerHp: number,
    playerArmor: number
  ): number {
    let score = 0;

    if (card.type === 'attack') {
      const effectiveDamage = Math.max(0, card.value - playerArmor);
      score += effectiveDamage * 8;

      if (effectiveDamage >= playerHp) {
        score += 10000;
      }
      if (playerHp <= 10) {
        score += 30;
      }
      if (aiHp <= 10 && card.energyCost >= 2) {
        score -= 15;
      }
    } else if (card.type === 'defense') {
      score += card.value * 5;
      if (aiHp < 15 && aiArmor === 0) {
        score += 50;
      }
      if (aiHp < 10) {
        score += 30;
      }
      if (aiArmor >= 8) {
        score -= 20;
      }
    } else {
      const actualHeal = Math.min(card.value, aiHp >= 30 ? 0 : 30 - aiHp);
      score += actualHeal * 9;
      if (aiHp < 10) {
        score += 80;
      }
      if (aiHp < 15) {
        score += 40;
      }
      if (aiHp >= 28) {
        score -= 60;
      }
    }

    if (card.energyCost === 2) {
      score += 3;
    }

    return score;
  }
}
