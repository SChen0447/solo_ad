import { Skill } from '../types'

export const skillPool: Skill[] = [
  {
    id: 'fireball',
    name: '火球术',
    icon: '🔥',
    type: 'active',
    cooldown: 3,
    description: '发射一颗炽热的火球，对单体目标造成150%攻击力+50点固定伤害',
    effects: [
      {
        type: 'damage',
        value: 0,
        damageMultiplier: 1.5,
        flatDamage: 50
      }
    ]
  },
  {
    id: 'heal-wave',
    name: '治疗波',
    icon: '💚',
    type: 'active',
    cooldown: 4,
    description: '释放治疗能量，回复自身30%最大生命值+100点固定生命',
    effects: [
      {
        type: 'heal',
        value: 0,
        healPercent: 0.3,
        flatHeal: 100
      }
    ]
  },
  {
    id: 'shield',
    name: '护盾',
    icon: '🛡️',
    type: 'active',
    cooldown: 5,
    description: '召唤能量护盾，在2回合内减少受到的40%伤害',
    effects: [
      {
        type: 'shield',
        value: 0.4,
        duration: 2,
        shieldPercent: 0.4
      }
    ]
  },
  {
    id: 'power-strike',
    name: '强力打击',
    icon: '💥',
    type: 'active',
    cooldown: 2,
    description: '蓄力后发出强力一击，造成200%攻击力的伤害',
    effects: [
      {
        type: 'damage',
        value: 0,
        damageMultiplier: 2.0,
        flatDamage: 0
      }
    ]
  },
  {
    id: 'lightning-bolt',
    name: '闪电链',
    icon: '⚡',
    type: 'active',
    cooldown: 3,
    description: '释放闪电，对目标造成180%攻击力+30点固定伤害',
    effects: [
      {
        type: 'damage',
        value: 0,
        damageMultiplier: 1.8,
        flatDamage: 30
      }
    ]
  },
  {
    id: 'ice-blast',
    name: '冰霜爆发',
    icon: '❄️',
    type: 'active',
    cooldown: 4,
    description: '释放冰霜能量，造成160%攻击力伤害并有额外效果',
    effects: [
      {
        type: 'damage',
        value: 0,
        damageMultiplier: 1.6,
        flatDamage: 40
      }
    ]
  },
  {
    id: 'rage',
    name: '狂暴',
    icon: '😤',
    type: 'active',
    cooldown: 5,
    description: '进入狂暴状态，接下来的攻击造成220%攻击力伤害',
    effects: [
      {
        type: 'damage',
        value: 0,
        damageMultiplier: 2.2,
        flatDamage: 20
      }
    ]
  },
  {
    id: 'holy-light',
    name: '圣光术',
    icon: '✨',
    type: 'active',
    cooldown: 3,
    description: '召唤圣光，回复20%最大生命值并造成100%攻击力的伤害',
    effects: [
      {
        type: 'heal',
        value: 0,
        healPercent: 0.2,
        flatHeal: 50
      }
    ]
  },
  {
    id: 'basic-attack',
    name: '普通攻击',
    icon: '👊',
    type: 'active',
    cooldown: 0,
    description: '基础攻击，造成100%攻击力的伤害，无冷却',
    effects: [
      {
        type: 'damage',
        value: 0,
        damageMultiplier: 1.0,
        flatDamage: 0
      }
    ]
  },
  {
    id: 'deadly-blow',
    name: '致命一击',
    icon: '🎯',
    type: 'active',
    cooldown: 6,
    description: '瞄准目标弱点，造成250%攻击力+80点固定伤害',
    effects: [
      {
        type: 'damage',
        value: 0,
        damageMultiplier: 2.5,
        flatDamage: 80
      }
    ]
  },
  {
    id: 'passive-regen',
    name: '生命回复',
    icon: '💗',
    type: 'passive',
    cooldown: 0,
    description: '被动技能：每回合回复5%最大生命值',
    effects: [
      {
        type: 'buff',
        value: 0.05,
        healPercent: 0.05
      }
    ]
  },
  {
    id: 'passive-thorns',
    name: '荆棘反伤',
    icon: '🌹',
    type: 'passive',
    cooldown: 0,
    description: '被动技能：受到攻击时反弹15%伤害',
    effects: [
      {
        type: 'buff',
        value: 0.15
      }
    ]
  }
]

export function getSkillById(id: string): Skill | undefined {
  return skillPool.find(s => s.id === id)
}

export function getActiveSkills(): Skill[] {
  return skillPool.filter(s => s.type === 'active')
}

export function getPassiveSkills(): Skill[] {
  return skillPool.filter(s => s.type === 'passive')
}
