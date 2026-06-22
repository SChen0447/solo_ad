/**
 * 战斗结算模块
 * 
 * 职责: 计算卡牌对战伤害，考虑护甲减伤与卡牌效果
 * 
 * 调用关系:
 * - 被依赖: types.ts (卡牌类型定义)
 * - 被调用: GameEngine (通过resolveCardPlay方法)
 * 
 * 数据流向:
 * GameEngine → resolveCardPlay(card, attacker, attackerState, defenderState)
 *   ↓ 计算伤害、治疗、护甲效果
 * 返回 BattleResult + 新的攻防双方状态 → GameEngine更新状态
 */

import { CardInstance, CardEffectType } from './types';

export interface HeroState {
  health: number;
  maxHealth: number;
  armor: number;
}

export interface BattleResult {
  attacker: 'player' | 'ai';
  card: CardInstance;
  damageDealt: number;
  armorAbsorbed: number;
  healthAfter: HeroState;
  effectsApplied: { type: CardEffectType; value: number }[];
}

export class BattleResolver {
  private readonly MAX_HEALTH: number = 15;
  private readonly INITIAL_ARMOR: number = 5;

  public createInitialHeroState(): HeroState {
    return {
      health: this.MAX_HEALTH,
      maxHealth: this.MAX_HEALTH,
      armor: this.INITIAL_ARMOR
    };
  }

  public resolveCardPlay(
    card: CardInstance,
    attacker: 'player' | 'ai',
    attackerState: HeroState,
    defenderState: HeroState
  ): { result: BattleResult; newAttackerState: HeroState; newDefenderState: HeroState } {
    let newAttackerState: HeroState = { ...attackerState };
    let newDefenderState: HeroState = { ...defenderState };
    let damageDealt: number = 0;
    let armorAbsorbed: number = 0;
    const effectsApplied: { type: CardEffectType; value: number }[] = [];

    for (const effect of card.card.effects) {
      switch (effect.type) {
        case 'damage':
          const dmgResult = this.applyDamage(newDefenderState, effect.value);
          newDefenderState = dmgResult.newState;
          damageDealt += dmgResult.damageDealt;
          armorAbsorbed += dmgResult.armorAbsorbed;
          effectsApplied.push({ type: 'damage', value: effect.value });
          break;
        case 'heal':
          newAttackerState = this.applyHeal(newAttackerState, effect.value);
          effectsApplied.push({ type: 'heal', value: effect.value });
          break;
        case 'armor':
          newAttackerState = this.applyArmor(newAttackerState, effect.value);
          effectsApplied.push({ type: 'armor', value: effect.value });
          break;
        case 'draw':
          effectsApplied.push({ type: 'draw', value: effect.value });
          break;
      }
    }

    const result: BattleResult = {
      attacker,
      card,
      damageDealt,
      armorAbsorbed,
      healthAfter: newDefenderState,
      effectsApplied
    };

    return { result, newAttackerState, newDefenderState };
  }

  private applyDamage(target: HeroState, damage: number): { newState: HeroState; damageDealt: number; armorAbsorbed: number } {
    let remainingDamage: number = damage;
    let armorAbsorbed: number = 0;
    let newArmor: number = target.armor;

    if (newArmor > 0) {
      const absorbed: number = Math.min(newArmor, remainingDamage);
      armorAbsorbed = absorbed;
      newArmor -= absorbed;
      remainingDamage -= absorbed;
    }

    const newHealth: number = Math.max(0, target.health - remainingDamage);

    return {
      newState: { ...target, health: newHealth, armor: newArmor },
      damageDealt: target.health - newHealth,
      armorAbsorbed
    };
  }

  private applyHeal(target: HeroState, healAmount: number): HeroState {
    const newHealth: number = Math.min(target.maxHealth, target.health + healAmount);
    return { ...target, health: newHealth };
  }

  private applyArmor(target: HeroState, armorAmount: number): HeroState {
    return { ...target, armor: target.armor + armorAmount };
  }

  public isDefeated(state: HeroState): boolean {
    return state.health <= 0;
  }
}
