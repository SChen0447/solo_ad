import type {
  Card,
  GameState,
  GamePhase,
  Player,
  AnimationEvent,
  FloatingText,
} from '../types/game';
import { CardDeck } from './CardDeck';
import { AIPlayer } from './AIPlayer';

const INITIAL_HP = 30;
const INITIAL_ENERGY = 3;
const INITIAL_HAND = 5;
const DRAW_PER_TURN = 1;
const AI_ACTION_DELAY = 800;

function createPlayer(): Player {
  return {
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    armor: 0,
    energy: INITIAL_ENERGY,
    maxEnergy: INITIAL_ENERGY,
    hand: [],
    deck: CardDeck.generateStandardDeck(),
    discard: [],
  };
}

export class GameLogic {
  state: GameState;
  private aiNextActionAt: number = 0;
  private pendingAiAction: boolean = false;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const player = createPlayer();
    const ai = createPlayer();
    return {
      turn: 1,
      currentPlayer: 'player',
      phase: 'playing',
      turnPhase: 'player_draw',
      player,
      ai,
      animations: [],
      floatingTexts: [],
    };
  }

  init(): void {
    this.state = this.createInitialState();
    CardDeck.drawCards(this.state.player, INITIAL_HAND);
    CardDeck.drawCards(this.state.ai, INITIAL_HAND);
    this.beginPlayerTurn(true);
  }

  restart(): void {
    this.init();
  }

  playCard(cardId: string): boolean {
    if (this.state.phase !== 'playing') return false;
    if (this.state.turnPhase !== 'player_action') return false;

    const card = this.state.player.hand.find((c) => c.id === cardId);
    if (!card) return false;
    if (card.cost > this.state.player.energy) return false;

    this.state.player.energy -= card.cost;
    CardDeck.discardCard(this.state.player, cardId);
    this.applyCardEffect(card, 'player', 'ai');

    this.state.battlefieldCard = card;
    this.state.battlefieldCardStartTime = performance.now();
    this.pushAnimation({
      type: 'card_play',
      from: 'player',
      card,
      startTime: performance.now(),
      duration: 600,
    });

    const result = this.checkVictory();
    if (result !== 'playing') {
      this.state.phase = result;
    }
    return true;
  }

  endTurn(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.turnPhase !== 'player_action') return;

    this.state.turnPhase = 'player_end';
    this.state.battlefieldCard = undefined;

    setTimeout(() => {
      this.beginAITurn();
    }, 300);
  }

  update(_dt: number): void {
    const now = performance.now();

    this.state.animations = this.state.animations.filter(
      (a) => now - a.startTime < a.duration
    );
    this.state.floatingTexts = this.state.floatingTexts.filter(
      (f) => now - f.startTime < f.duration
    );

    if (
      this.state.battlefieldCardStartTime !== undefined &&
      now - this.state.battlefieldCardStartTime > 900
    ) {
      this.state.battlefieldCard = undefined;
      this.state.battlefieldCardStartTime = undefined;
    }

    if (
      this.state.messageStartTime !== undefined &&
      this.state.messageDuration !== undefined &&
      now - this.state.messageStartTime > this.state.messageDuration
    ) {
      this.state.message = undefined;
      this.state.messageStartTime = undefined;
      this.state.messageDuration = undefined;
    }

    if (
      this.state.phase === 'playing' &&
      this.state.turnPhase === 'ai_action' &&
      now >= this.aiNextActionAt &&
      this.pendingAiAction
    ) {
      this.processAIStep();
    }
  }

  private beginPlayerTurn(first: boolean = false): void {
    this.state.currentPlayer = 'player';
    this.state.turnPhase = 'player_draw';

    if (!first) {
      this.state.turn += 1;
    }
    this.state.player.energy = INITIAL_ENERGY;
    CardDeck.drawCards(this.state.player, DRAW_PER_TURN);

    this.state.message = '你的回合';
    this.state.messageStartTime = performance.now();
    this.state.messageDuration = 1200;

    this.pushAnimation({
      type: 'turn_switch',
      from: 'player',
      startTime: performance.now(),
      duration: 1000,
    });

    setTimeout(() => {
      this.state.turnPhase = 'player_action';
    }, 900);
  }

  private beginAITurn(): void {
    this.state.currentPlayer = 'ai';
    this.state.turnPhase = 'ai_draw';
    this.state.ai.energy = INITIAL_ENERGY;
    this.state.ai.armor = 0;
    CardDeck.drawCards(this.state.ai, DRAW_PER_TURN);

    this.state.message = 'AI回合';
    this.state.messageStartTime = performance.now();
    this.state.messageDuration = 1200;

    this.pushAnimation({
      type: 'turn_switch',
      from: 'ai',
      startTime: performance.now(),
      duration: 1000,
    });

    setTimeout(() => {
      this.state.turnPhase = 'ai_action';
      this.scheduleAIAction(600);
    }, 900);
  }

  private scheduleAIAction(delay: number = AI_ACTION_DELAY): void {
    this.aiNextActionAt = performance.now() + delay;
    this.pendingAiAction = true;
  }

  private processAIStep(): void {
    this.pendingAiAction = false;

    if (this.state.phase !== 'playing') return;
    if (this.state.turnPhase !== 'ai_action') return;

    const action = AIPlayer.getAction(this.state);
    if (action === 'end_turn') {
      this.state.turnPhase = 'ai_end';
      this.state.battlefieldCard = undefined;
      this.state.player.armor = 0;
      setTimeout(() => {
        this.beginPlayerTurn();
      }, 400);
      return;
    }

    const card = this.state.ai.hand.find((c) => c.id === action);
    if (!card) {
      this.state.turnPhase = 'ai_end';
      setTimeout(() => this.beginPlayerTurn(), 400);
      return;
    }

    this.state.ai.energy -= card.cost;
    CardDeck.discardCard(this.state.ai, card.id);
    this.applyCardEffect(card, 'ai', 'player');

    this.state.battlefieldCard = card;
    this.state.battlefieldCardStartTime = performance.now();
    this.pushAnimation({
      type: 'card_play',
      from: 'ai',
      card,
      startTime: performance.now(),
      duration: 600,
    });

    const result = this.checkVictory();
    if (result !== 'playing') {
      this.state.phase = result;
      return;
    }

    this.scheduleAIAction(AI_ACTION_DELAY);
  }

  private applyCardEffect(card: Card, casterKey: 'player' | 'ai', targetKey: 'player' | 'ai'): void {
    const caster = this.state[casterKey];
    const target = this.state[targetKey];
    const now = performance.now();

    if (card.type === 'attack') {
      const damage = card.value;
      const absorbed = Math.min(target.armor, damage);
      const hpDamage = damage - absorbed;
      target.armor -= absorbed;
      target.hp = Math.max(0, target.hp - hpDamage);

      if (targetKey === 'player') {
        this.state.playerFlashEndTime = now + 400;
      } else {
        this.state.aiFlashEndTime = now + 400;
      }

      this.pushFloatingText({
        text: `-${hpDamage}`,
        x: targetKey === 'player' ? 220 : 1220,
        y: targetKey === 'player' ? 640 : 140,
        color: '#ff4757',
        startTime: now + 250,
        duration: 900,
      });

      this.pushAnimation({
        type: 'damage',
        from: casterKey,
        to: targetKey,
        value: hpDamage,
        startTime: now,
        duration: 500,
      });
    } else if (card.type === 'defense') {
      caster.armor += card.value;
      if (casterKey === 'player') {
        this.state.playerFlashEndTime = now + 300;
      } else {
        this.state.aiFlashEndTime = now + 300;
      }

      this.pushFloatingText({
        text: `+${card.value} \u{1F6E1}`,
        x: casterKey === 'player' ? 220 : 1220,
        y: casterKey === 'player' ? 640 : 140,
        color: '#4a9eff',
        startTime: now + 250,
        duration: 900,
      });

      this.pushAnimation({
        type: 'shield',
        from: casterKey,
        to: casterKey,
        value: card.value,
        startTime: now,
        duration: 500,
      });
    } else {
      const actualHeal = Math.min(card.value, caster.maxHp - caster.hp);
      caster.hp = Math.min(caster.maxHp, caster.hp + actualHeal);

      this.pushFloatingText({
        text: `+${actualHeal}`,
        x: casterKey === 'player' ? 220 : 1220,
        y: casterKey === 'player' ? 640 : 140,
        color: '#52b788',
        startTime: now + 250,
        duration: 900,
      });

      this.pushAnimation({
        type: 'heal',
        from: casterKey,
        to: casterKey,
        value: actualHeal,
        startTime: now,
        duration: 500,
      });
    }
  }

  private checkVictory(): GamePhase {
    if (this.state.player.hp <= 0) return 'defeat';
    if (this.state.ai.hp <= 0) return 'victory';
    return 'playing';
  }

  private pushAnimation(ev: AnimationEvent): void {
    this.state.animations.push(ev);
  }

  private pushFloatingText(ft: FloatingText): void {
    this.state.floatingTexts.push(ft);
  }
}
