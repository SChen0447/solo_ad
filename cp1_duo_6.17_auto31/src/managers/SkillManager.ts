import { SkillData, SkillState } from '../models/TypeDefinitions';

const ALL_SKILLS: SkillData[] = [
  {
    id: 'power_strike',
    name: '力量重击',
    description: '造成1.8倍伤害',
    effectType: 'damage',
    damageMultiplier: 1.8,
    healPercent: 0,
    armorBreakPercent: 0,
    stunDuration: 0,
    burnDamage: 0,
    burnDuration: 0,
    shieldAmount: 0,
    cooldown: 2,
    iconColor: '#ff4444',
    iconSymbol: '⚔',
  },
  {
    id: 'heal',
    name: '治疗术',
    description: '恢复30%最大生命',
    effectType: 'heal',
    damageMultiplier: 0,
    healPercent: 0.3,
    armorBreakPercent: 0,
    stunDuration: 0,
    burnDamage: 0,
    burnDuration: 0,
    shieldAmount: 0,
    cooldown: 3,
    iconColor: '#44ff88',
    iconSymbol: '✚',
  },
  {
    id: 'armor_break',
    name: '破甲斩',
    description: '减少敌人50%防御并造成1.2倍伤害',
    effectType: 'armorBreak',
    damageMultiplier: 1.2,
    healPercent: 0,
    armorBreakPercent: 0.5,
    stunDuration: 0,
    burnDamage: 0,
    burnDuration: 0,
    shieldAmount: 0,
    cooldown: 3,
    iconColor: '#ffaa00',
    iconSymbol: '⇓',
  },
  {
    id: 'stun',
    name: '雷霆一击',
    description: '造成0.8倍伤害并眩晕1回合',
    effectType: 'stun',
    damageMultiplier: 0.8,
    healPercent: 0,
    armorBreakPercent: 0,
    stunDuration: 1,
    burnDamage: 0,
    burnDuration: 0,
    shieldAmount: 0,
    cooldown: 4,
    iconColor: '#ffff44',
    iconSymbol: '⚡',
  },
  {
    id: 'burn',
    name: '烈焰冲击',
    description: '造成1倍伤害并灼烧3回合',
    effectType: 'burn',
    damageMultiplier: 1.0,
    healPercent: 0,
    armorBreakPercent: 0,
    stunDuration: 0,
    burnDamage: 8,
    burnDuration: 3,
    shieldAmount: 0,
    cooldown: 3,
    iconColor: '#ff6600',
    iconSymbol: '🔥',
  },
  {
    id: 'shield',
    name: '守护之盾',
    description: '获得护盾抵消30点伤害',
    effectType: 'shield',
    damageMultiplier: 0,
    healPercent: 0,
    armorBreakPercent: 0,
    stunDuration: 0,
    burnDamage: 0,
    burnDuration: 0,
    shieldAmount: 30,
    cooldown: 4,
    iconColor: '#44aaff',
    iconSymbol: '🛡',
  },
  {
    id: 'execute',
    name: '致命一击',
    description: '造成2.5倍伤害但防御降低20%',
    effectType: 'damage',
    damageMultiplier: 2.5,
    healPercent: 0,
    armorBreakPercent: -0.2,
    stunDuration: 0,
    burnDamage: 0,
    burnDuration: 0,
    shieldAmount: 0,
    cooldown: 4,
    iconColor: '#cc2244',
    iconSymbol: '💀',
  },
  {
    id: 'vampiric',
    name: '吸血打击',
    description: '造成1.3倍伤害并恢复伤害25%的生命',
    effectType: 'damage',
    damageMultiplier: 1.3,
    healPercent: 0.25,
    armorBreakPercent: 0,
    stunDuration: 0,
    burnDamage: 0,
    burnDuration: 0,
    shieldAmount: 0,
    cooldown: 3,
    iconColor: '#cc44cc',
    iconSymbol: '🩸',
  },
];

class SkillManager {
  private availableSkills: SkillData[] = [];

  loadSkills() {
    this.availableSkills = ALL_SKILLS;
  }

  getRandomSkills(count: number = 3): SkillData[] {
    const shuffled = [...this.availableSkills].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  createSkillStates(skills: SkillData[]): SkillState[] {
    return skills.map(skill => ({
      skill,
      currentCooldown: 0,
    }));
  }

  reduceCooldowns(states: SkillState[]): void {
    for (const state of states) {
      if (state.currentCooldown > 0) {
        state.currentCooldown--;
      }
    }
  }

  getAllSkills(): SkillData[] {
    return this.availableSkills;
  }
}

export const skillManager = new SkillManager();
