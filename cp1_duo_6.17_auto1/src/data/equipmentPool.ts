import { Equipment, EquipmentTemplate, SubStat, SubStatType } from '../types'

export const subStatRanges: Record<SubStatType, [number, number]> = {
  critDamage: [5, 20],
  dodgeRate: [2, 8],
  lifeSteal: [1, 5],
  cooldownReduction: [3, 12]
}

export const subStatNames: Record<SubStatType, string> = {
  critDamage: '暴击伤害',
  dodgeRate: '闪避率',
  lifeSteal: '生命偷取',
  cooldownReduction: '技能冷却缩减'
}

const weaponTemplates: EquipmentTemplate[] = [
  {
    id: 'weapon-1',
    name: '烈焰长剑',
    slot: 'weapon',
    icon: '⚔️',
    baseStats: { attack: 80, critRate: 5 }
  },
  {
    id: 'weapon-2',
    name: '暗影匕首',
    slot: 'weapon',
    icon: '🗡️',
    baseStats: { attack: 50, agility: 30, critRate: 10 }
  },
  {
    id: 'weapon-3',
    name: '雷霆战锤',
    slot: 'weapon',
    icon: '🔨',
    baseStats: { attack: 120, maxHp: 200 }
  },
  {
    id: 'weapon-4',
    name: '寒霜法杖',
    slot: 'weapon',
    icon: '🪄',
    baseStats: { attack: 70, maxHp: 150 }
  }
]

const armorTemplates: EquipmentTemplate[] = [
  {
    id: 'armor-1',
    name: '龙鳞铠甲',
    slot: 'armor',
    icon: '🛡️',
    baseStats: { defense: 80, maxHp: 500 }
  },
  {
    id: 'armor-2',
    name: '秘银锁甲',
    slot: 'armor',
    icon: '🥋',
    baseStats: { defense: 50, agility: 20, maxHp: 300 }
  },
  {
    id: 'armor-3',
    name: '黑曜石板甲',
    slot: 'armor',
    icon: '🦺',
    baseStats: { defense: 100, maxHp: 400 }
  },
  {
    id: 'armor-4',
    name: '精灵皮甲',
    slot: 'armor',
    icon: '🎽',
    baseStats: { defense: 35, agility: 40, critRate: 5 }
  }
]

const ringTemplates: EquipmentTemplate[] = [
  {
    id: 'ring-1',
    name: '狂暴之戒',
    slot: 'ring',
    icon: '💍',
    baseStats: { attack: 30, critRate: 8 }
  },
  {
    id: 'ring-2',
    name: '守护指环',
    slot: 'ring',
    icon: '⭕',
    baseStats: { defense: 25, maxHp: 250 }
  },
  {
    id: 'ring-3',
    name: '疾风戒指',
    slot: 'ring',
    icon: '🔵',
    baseStats: { agility: 50, critRate: 5 }
  },
  {
    id: 'ring-4',
    name: '生命宝珠',
    slot: 'ring',
    icon: '🔴',
    baseStats: { maxHp: 600, defense: 15 }
  }
]

const bootsTemplates: EquipmentTemplate[] = [
  {
    id: 'boots-1',
    name: '疾风战靴',
    slot: 'boots',
    icon: '👢',
    baseStats: { agility: 60, defense: 10 }
  },
  {
    id: 'boots-2',
    name: '厚重铁靴',
    slot: 'boots',
    icon: '🥾',
    baseStats: { defense: 40, maxHp: 200 }
  },
  {
    id: 'boots-3',
    name: '迅捷皮靴',
    slot: 'boots',
    icon: '🥿',
    baseStats: { agility: 45, critRate: 5 }
  },
  {
    id: 'boots-4',
    name: '巨龙战靴',
    slot: 'boots',
    icon: '👟',
    baseStats: { defense: 50, attack: 20, maxHp: 150 }
  }
]

export const equipmentTemplates: EquipmentTemplate[] = [
  ...weaponTemplates,
  ...armorTemplates,
  ...ringTemplates,
  ...bootsTemplates
]

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateRandomSubStats(): SubStat[] {
  const types: SubStatType[] = ['critDamage', 'dodgeRate', 'lifeSteal', 'cooldownReduction']
  const shuffled = fisherYatesShuffle(types)
  const selected = shuffled.slice(0, 2)
  return selected.map(type => ({
    type,
    value: randomInRange(subStatRanges[type][0], subStatRanges[type][1])
  }))
}

export function createEquipmentFromTemplate(template: EquipmentTemplate): Equipment {
  return {
    ...template,
    id: `${template.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    subStats: generateRandomSubStats()
  }
}

export function generateEquipmentPool(): Equipment[] {
  return equipmentTemplates.map(template => createEquipmentFromTemplate(template))
}

export const slotNames: Record<string, string> = {
  weapon: '武器',
  armor: '铠甲',
  ring: '戒指',
  boots: '靴子'
}
