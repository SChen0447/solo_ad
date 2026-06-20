import { CardInstance, hasAdvantage } from './cardData';
import { GameState, canPlayCard, Difficulty } from './gameEngine';

export interface AIDecision {
  type: 'playCard' | 'attack' | 'directAttack' | 'endTurn';
  card?: CardInstance;
  target?: CardInstance;
}

export function decideAIAction(state: GameState, difficulty: Difficulty): AIDecision {
  const ai = state.ai;
  const player = state.player;

  const playableCards = ai.hand.filter(card => canPlayCard(ai, card));
  const attackableCards = ai.field.filter(c => c.canAttack && !c.hasAttacked);

  if (playableCards.length > 0) {
    const cardToPlay = chooseCardToPlay(playableCards, state, difficulty);
    if (cardToPlay) {
      return { type: 'playCard', card: cardToPlay };
    }
  }

  if (attackableCards.length > 0 && player.field.length > 0) {
    const attacker = chooseAttacker(attackableCards, state, difficulty);
    if (attacker) {
      const target = chooseTarget(attacker, player.field, difficulty);
      if (target) {
        return { type: 'attack', card: attacker, target };
      }
    }
  }

  if (attackableCards.length > 0 && player.field.length === 0) {
    return { type: 'directAttack', card: attackableCards[0] };
  }

  return { type: 'endTurn' };
}

function chooseCardToPlay(
  playableCards: CardInstance[],
  state: GameState,
  difficulty: Difficulty
): CardInstance | null {
  if (playableCards.length === 0) return null;

  const ai = state.ai;
  const player = state.player;

  switch (difficulty) {
    case 'easy':
      return playableCards[Math.floor(Math.random() * playableCards.length)];

    case 'normal':
      playableCards.sort((a, b) => b.cost - a.cost);
      return playableCards[0];

    case 'hard': {
      const scored = playableCards.map(card => {
        let score = 0;
        score += card.cost * 2;
        score += card.currentAttack * 1.5;
        score += card.currentHealth;

        if (player.field.length === 0 && card.type === 'attack') {
          score += 5;
        }

        if (player.field.length > 0) {
          let advantageCount = 0;
          player.field.forEach(pCard => {
            if (hasAdvantage(card.element, pCard.element)) {
              advantageCount++;
            }
          });
          score += advantageCount * 3;
        }

        if (ai.field.length === 0 && card.type === 'defense') {
          score += 3;
        }

        if (card.skill === '突袭' || card.skill === '暗影突袭') {
          score += 4;
        }

        return { card, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored[0].card;
    }

    default:
      return playableCards[0];
  }
}

function chooseAttacker(
  attackableCards: CardInstance[],
  state: GameState,
  difficulty: Difficulty
): CardInstance | null {
  if (attackableCards.length === 0) return null;

  switch (difficulty) {
    case 'easy':
      return attackableCards[Math.floor(Math.random() * attackableCards.length)];

    case 'normal':
      attackableCards.sort((a, b) => b.currentAttack - a.currentAttack);
      return attackableCards[0];

    case 'hard': {
      const player = state.player;
      const scored = attackableCards.map(card => {
        let score = 0;
        score += card.currentAttack * 2;

        let canKill = false;
        player.field.forEach(target => {
          if (card.currentAttack >= target.currentHealth) {
            canKill = true;
            score += 5;
          }
          if (hasAdvantage(card.element, target.element)) {
            score += 3;
          }
        });

        return { card, score, canKill };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored[0].card;
    }

    default:
      return attackableCards[0];
  }
}

function chooseTarget(
  attacker: CardInstance,
  targets: CardInstance[],
  difficulty: Difficulty
): CardInstance | null {
  if (targets.length === 0) return null;

  switch (difficulty) {
    case 'easy':
      return targets[Math.floor(Math.random() * targets.length)];

    case 'normal': {
      const sorted = [...targets].sort((a, b) => a.currentHealth - b.currentHealth);
      return sorted[0];
    }

    case 'hard': {
      const scored = targets.map(target => {
        let score = 0;
        const advantage = hasAdvantage(attacker.element, target.element);
        const dmg = advantage ? Math.floor(attacker.currentAttack * 1.5) : attacker.currentAttack;
        const willKill = dmg >= target.currentHealth;

        if (willKill) {
          score += 20;
        }

        if (advantage) {
          score += 10;
        }

        score += target.currentAttack * 2;

        score -= target.currentHealth * 0.5;

        if (target.type === 'support') {
          score += 8;
        }

        if (target.skill === '治愈之泉' || target.skill === '圣光治愈') {
          score += 10;
        }

        return { target, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored[0].target;
    }

    default:
      return targets[0];
  }
}

export function shouldAIEndTurn(state: GameState, difficulty: Difficulty): boolean {
  const ai = state.ai;
  const playableCards = ai.hand.filter(card => canPlayCard(ai, card));
  const attackableCards = ai.field.filter(c => c.canAttack && !c.hasAttacked);

  if (playableCards.length > 0) return false;
  if (attackableCards.length > 0 && state.player.field.length > 0) return false;
  if (attackableCards.length > 0 && state.player.field.length === 0) return false;

  return true;
}
