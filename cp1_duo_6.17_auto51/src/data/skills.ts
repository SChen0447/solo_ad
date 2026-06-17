import { Skill } from '../types';

export const SKILLS: Skill[] = [
  { id: 'slash', name: '猛击', description: '对单体造成150%攻击力伤害', damage: 1.5, cooldown: 2, range: 1, type: 'damage', icon: '⚔️' },
  { id: 'whirlwind', name: '旋风斩', description: '对周围敌人造成80%攻击力伤害', damage: 0.8, cooldown: 3, range: 2, type: 'damage', icon: '🌀' },
  { id: 'berserk', name: '狂暴', description: '提升自身攻击力30%持续3回合', damage: 0, cooldown: 5, range: 0, type: 'buff', icon: '💢' },
  { id: 'fireball', name: '火球术', description: '发射火球造成180%攻击力伤害', damage: 1.8, cooldown: 2, range: 5, type: 'damage', icon: '🔥' },
  { id: 'frostbolt', name: '冰霜箭', description: '造成120%伤害并减速目标', damage: 1.2, cooldown: 2, range: 4, type: 'damage', icon: '❄️' },
  { id: 'meteor', name: '陨石术', description: '对区域造成250%攻击力伤害', damage: 2.5, cooldown: 5, range: 6, type: 'damage', icon: '☄️' },
  { id: 'arrow', name: '精准射击', description: '远程攻击造成130%伤害', damage: 1.3, cooldown: 1, range: 6, type: 'damage', icon: '🏹' },
  { id: 'multishot', name: '多重射击', description: '同时攻击3个目标各造成80%伤害', damage: 0.8, cooldown: 3, range: 5, type: 'damage', icon: '🎯' },
  { id: 'trap', name: '陷阱', description: '放置陷阱造成200%伤害', damage: 2.0, cooldown: 4, range: 4, type: 'damage', icon: '🪤' },
  { id: 'shieldbash', name: '盾击', description: '造成100%伤害并眩晕', damage: 1.0, cooldown: 3, range: 1, type: 'damage', icon: '🛡️' },
  { id: 'taunt', name: '嘲讽', description: '吸引所有敌人攻击自己', damage: 0, cooldown: 4, range: 0, type: 'buff', icon: '😤' },
  { id: 'fortify', name: '坚守', description: '提升防御力50%持续2回合', damage: 0, cooldown: 4, range: 0, type: 'buff', icon: '🏰' },
  { id: 'backstab', name: '背刺', description: '造成200%暴击伤害', damage: 2.0, cooldown: 2, range: 1, type: 'damage', icon: '🗡️' },
  { id: 'shadowstep', name: '暗影步', description: '瞬移到目标身后并攻击', damage: 1.5, cooldown: 3, range: 3, type: 'damage', icon: '👤' },
  { id: 'poisonblade', name: '毒刃', description: '造成伤害并附加持续毒伤', damage: 0.8, cooldown: 2, range: 1, type: 'debuff', icon: '☠️' },
  { id: 'heal', name: '治疗术', description: '恢复目标30%最大生命值', damage: -0.3, cooldown: 2, range: 3, type: 'heal', icon: '💚' },
  { id: 'blessing', name: '祝福', description: '提升全体攻防15%', damage: 0, cooldown: 5, range: 0, type: 'buff', icon: '✨' },
  { id: 'revive', name: '复活', description: '复活一名阵亡英雄恢复50%生命', damage: -0.5, cooldown: 8, range: 5, type: 'heal', icon: '💫' },
];

export function getSkillsByClass(heroClass: string): Skill[] {
  const skillMap: Record<string, string[]> = {
    warrior: ['slash', 'whirlwind', 'berserk'],
    mage: ['fireball', 'frostbolt', 'meteor'],
    archer: ['arrow', 'multishot', 'trap'],
    tank: ['shieldbash', 'taunt', 'fortify'],
    assassin: ['backstab', 'shadowstep', 'poisonblade'],
    support: ['heal', 'blessing', 'revive'],
  };
  const ids = skillMap[heroClass] || [];
  return SKILLS.filter(s => ids.includes(s.id));
}
