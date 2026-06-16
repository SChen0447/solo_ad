import {
  GameState,
  Player,
  Monster,
  Card,
  CardType,
  GamePhase,
  Particle,
  FloatingText,
  CardAnimation,
} from './types';
import { CardManager } from './CardManager';

const MAX_ANIMATIONS = 3;
const ANIMATION_DURATION = 500;

export class GameEngine {
  state: GameState;
  cardManager: CardManager;
  private onStateChange?: () => void;

  constructor() {
    this.cardManager = new CardManager();
    this.state = this.createInitialState();
  }

  setOnStateChange(cb: () => void) {
    this.onStateChange = cb;
  }

  private notify() {
    if (this.onStateChange) this.onStateChange();
  }

  private createInitialState(): GameState {
    const player: Player = {
      hp: 50,
      maxHp: 50,
      energy: 3,
      maxEnergy: 3,
      shield: 0,
      shieldTurnsLeft: 0,
    };

    const monster: Monster = {
      name: '暗影巨龙',
      hp: 60,
      maxHp: 60,
      shield: 0,
      shieldTurnsLeft: 0,
      attackMin: 4,
      attackMax: 9,
      breathPhase: 0,
      shakeTimer: 0,
      shakeIntensity: 0,
    };

    const deck = this.cardManager.createStarterDeck();
    const hand = this.cardManager.drawCards(deck, 5);
    const remaining = deck.filter((c) => !hand.includes(c));

    return {
      player,
      monster,
      hand,
      deck: remaining,
      turn: 1,
      phase: 'playerTurn',
      particles: [],
      floatingTexts: [],
      cardAnimations: [],
      battleLog: ['⚔️ 战斗开始！'],
      hoveredCardIndex: -1,
      restartButtonBounds: null,
      endTurnButtonBounds: null,
    };
  }

  restart() {
    this.cardManager = new CardManager();
    this.state = this.createInitialState();
    this.notify();
  }

  playCard(cardIndex: number, cardPositions: { x: number; y: number }[], center: { x: number; y: number }) {
    if (this.state.phase !== 'playerTurn') return;

    const card = this.state.hand[cardIndex];
    if (!card) return;
    if (card.cost > this.state.player.energy) return;
    if (this.state.cardAnimations.length >= MAX_ANIMATIONS) return;

    this.state.player.energy -= card.cost;
    this.state.hand.splice(cardIndex, 1);

    const from = cardPositions[cardIndex] || { x: 0, y: 0 };

    const anim: CardAnimation = {
      card,
      fromX: from.x,
      fromY: from.y,
      toX: center.x,
      toY: center.y,
      progress: 0,
      duration: ANIMATION_DURATION,
      type: card.type,
      completed: false,
    };

    this.state.cardAnimations.push(anim);
    this.state.phase = 'animating';
    this.notify();
  }

  endPlayerTurn() {
    if (this.state.phase !== 'playerTurn') return;

    if (this.state.player.shieldTurnsLeft > 0) {
      this.state.player.shieldTurnsLeft--;
      if (this.state.player.shieldTurnsLeft <= 0) {
        this.state.player.shield = 0;
      }
    }

    this.state.phase = 'enemyTurn';
    this.state.battleLog.push(`🔄 第 ${this.state.turn} 回合结束`);
    this.notify();

    setTimeout(() => this.executeEnemyTurn(), 800);
  }

  private executeEnemyTurn() {
    if (this.state.phase !== 'enemyTurn') return;

    const m = this.state.monster;
    const rawDmg = Math.floor(Math.random() * (m.attackMax - m.attackMin + 1)) + m.attackMin;
    let damage = rawDmg;

    if (this.state.player.shield > 0) {
      const absorbed = Math.min(this.state.player.shield, damage);
      damage -= absorbed;
      this.state.player.shield -= absorbed;
      if (absorbed > 0) {
        this.state.battleLog.push(`🛡️ 护盾吸收了 ${absorbed} 点伤害`);
      }
    }

    this.state.player.hp = Math.max(0, this.state.player.hp - damage);
    this.state.battleLog.push(`🐉 ${m.name} 攻击了玩家，造成 ${rawDmg} 点伤害`);

    this.state.floatingTexts.push({
      x: 0.22,
      y: 0.45,
      text: `-${rawDmg}`,
      color: '#ff4444',
      life: 60,
      maxLife: 60,
      vy: -0.008,
    });

    if (this.state.player.hp <= 0) {
      this.state.phase = 'defeat';
      this.state.battleLog.push('💀 你被击败了...');
      this.notify();
      return;
    }

    this.state.turn++;
    this.state.player.energy = Math.min(this.state.player.maxEnergy, this.state.player.energy + 1);

    const drawn = this.cardManager.drawCards(this.state.deck, 1);
    this.state.hand.push(...drawn);
    this.state.deck = this.state.deck.filter((c) => !drawn.includes(c));

    if (this.state.deck.length === 0) {
      this.state.deck = this.cardManager.createStarterDeck();
    }

    this.state.phase = 'playerTurn';
    this.state.battleLog.push(`⚔️ 第 ${this.state.turn} 回合开始，抽了1张牌`);
    this.notify();
  }

  resolveCardAnimation(anim: CardAnimation) {
    const { card } = anim;

    switch (card.type) {
      case CardType.Attack: {
        const dmg = Math.floor(Math.random() * ((card.maxValue || card.value) - (card.minValue || card.value) + 1)) + (card.minValue || card.value);
        let actualDmg = dmg;

        if (this.state.monster.shield > 0) {
          const absorbed = Math.min(this.state.monster.shield, actualDmg);
          actualDmg -= absorbed;
          this.state.monster.shield -= absorbed;
        }

        this.state.monster.hp = Math.max(0, this.state.monster.hp - actualDmg);
        this.state.monster.shakeTimer = 20;
        this.state.monster.shakeIntensity = 8;
        this.state.battleLog.push(`⚔️ 使用 ${card.name}，造成 ${actualDmg} 点伤害`);

        this.state.floatingTexts.push({
          x: 0.72,
          y: 0.4,
          text: `-${actualDmg}`,
          color: '#ff6622',
          life: 60,
          maxLife: 60,
          vy: -0.01,
        });

        this.spawnParticles(0.72, 0.4, '#ff4400', '#ffaa00', 25);
        break;
      }
      case CardType.Defense: {
        this.state.player.shield = card.value;
        this.state.player.shieldTurnsLeft = 2;
        this.state.battleLog.push(`🛡️ 使用 ${card.name}，获得 ${card.value} 点护盾（持续2回合）`);

        this.state.floatingTexts.push({
          x: 0.22,
          y: 0.4,
          text: `+🛡️${card.value}`,
          color: '#4488ff',
          life: 60,
          maxLife: 60,
          vy: -0.01,
        });

        this.spawnParticles(0.22, 0.4, '#2266ff', '#88bbff', 20);
        break;
      }
      case CardType.Heal: {
        const healed = Math.min(card.value, this.state.player.maxHp - this.state.player.hp);
        this.state.player.hp += healed;
        this.state.battleLog.push(`💚 使用 ${card.name}，恢复 ${healed} 点生命`);

        this.state.floatingTexts.push({
          x: 0.22,
          y: 0.4,
          text: `+${healed}`,
          color: '#44ff44',
          life: 60,
          maxLife: 60,
          vy: -0.01,
        });

        this.spawnParticles(0.22, 0.4, '#22ff44', '#88ffaa', 20);
        break;
      }
    }

    if (this.state.monster.hp <= 0) {
      this.state.phase = 'victory';
      this.state.battleLog.push('🎉 你击败了暗影巨龙！');
    } else {
      this.state.phase = 'playerTurn';
    }
  }

  private spawnParticles(x: number, y: number, color1: string, color2: string, count: number) {
    const limit = Math.min(count, 30 - this.state.particles.length);
    for (let i = 0; i < limit; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.002 + Math.random() * 0.006;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        color: Math.random() > 0.5 ? color1 : color2,
        size: 2 + Math.random() * 4,
      });
    }
  }

  update(dt: number) {
    for (const anim of this.state.cardAnimations) {
      if (!anim.completed) {
        anim.progress += dt / anim.duration;
        if (anim.progress >= 1) {
          anim.progress = 1;
          anim.completed = true;
          this.resolveCardAnimation(anim);
        }
      }
    }

    this.state.cardAnimations = this.state.cardAnimations.filter((a) => !a.completed || a.progress < 2);

    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }

    for (let i = this.state.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.state.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 1;
      if (ft.life <= 0) {
        this.state.floatingTexts.splice(i, 1);
      }
    }

    this.state.monster.breathPhase += 0.03;

    if (this.state.monster.shakeTimer > 0) {
      this.state.monster.shakeTimer -= 1;
      this.state.monster.shakeIntensity *= 0.9;
    }

    const completed = this.state.cardAnimations.filter((a) => a.completed);
    if (completed.length > 0) {
      this.state.cardAnimations = this.state.cardAnimations.filter((a) => !a.completed);
    }
  }
}
