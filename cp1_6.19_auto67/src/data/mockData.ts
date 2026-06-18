import { Material, Recipe, MaterialType } from '../types'

export const MATERIALS: Material[] = [
  {
    id: 'fire-element',
    name: '火元素',
    icon: '🔥',
    type: MaterialType.ELEMENT,
    description: '蕴含炽热能量的基础元素，可用于金属熔炼',
    color: '#ff6b6b'
  },
  {
    id: 'water-element',
    name: '水元素',
    icon: '💧',
    type: MaterialType.ELEMENT,
    description: '纯净流动的基础元素，用于调和与溶解',
    color: '#4ecdc4'
  },
  {
    id: 'earth-element',
    name: '土元素',
    icon: '🪨',
    type: MaterialType.ELEMENT,
    description: '厚重坚实的基础元素，提供物质基础',
    color: '#a87d5c'
  },
  {
    id: 'wind-element',
    name: '风元素',
    icon: '💨',
    type: MaterialType.ELEMENT,
    description: '轻盈自由的基础元素，引导能量流动',
    color: '#a8e6cf'
  },
  {
    id: 'iron-ore',
    name: '铁矿',
    icon: '⛓️',
    type: MaterialType.METAL,
    description: '常见的金属矿石，坚硬而稳定',
    color: '#8b8b8b'
  },
  {
    id: 'copper-ore',
    name: '铜矿',
    icon: '🪙',
    type: MaterialType.METAL,
    description: '带有温暖色泽的金属矿石',
    color: '#cd7f32'
  },
  {
    id: 'silver-ore',
    name: '银矿',
    icon: '✨',
    type: MaterialType.METAL,
    description: '闪耀银光的珍贵矿石，蕴含神秘能量',
    color: '#c0c0c0'
  },
  {
    id: 'herb',
    name: '草药',
    icon: '🌿',
    type: MaterialType.ORGANIC,
    description: '生长在森林深处的神秘草药，具有疗愈之力',
    color: '#6bcb77'
  },
  {
    id: 'mushroom',
    name: '蘑菇',
    icon: '🍄',
    type: MaterialType.ORGANIC,
    description: '洞穴中发现的发光蘑菇，含有奇特成分',
    color: '#ff8c69'
  },
  {
    id: 'crystal-rough',
    name: '水晶原石',
    icon: '💎',
    type: MaterialType.GEM,
    description: '未切割的纯净水晶，等待被唤醒力量',
    color: '#7b68ee'
  },
  {
    id: 'sage-dust',
    name: '贤者之尘',
    icon: '⭐',
    type: MaterialType.SPECIAL,
    description: '传说中贤者遗留的神秘粉末，极其稀有',
    color: '#ffd700'
  },
  {
    id: 'copper-ingot',
    name: '铜锭',
    icon: '🟠',
    type: MaterialType.PRODUCT,
    description: '经过精炼的纯净铜锭',
    color: '#b87333'
  },
  {
    id: 'crystal-gem',
    name: '水晶宝石',
    icon: '💠',
    type: MaterialType.PRODUCT,
    description: '经过雕琢的水晶，散发出迷人光芒',
    color: '#9370db'
  },
  {
    id: 'bronze-ingot',
    name: '青铜锭',
    icon: '🟤',
    type: MaterialType.PRODUCT,
    description: '铜与银的完美合金，坚固而充满魔力',
    color: '#cd7f32'
  },
  {
    id: 'healing-potion',
    name: '治疗药水',
    icon: '🧪',
    type: MaterialType.PRODUCT,
    description: '散发着草药清香的神奇药水，可治愈伤痛',
    color: '#32cd32'
  },
  {
    id: 'philosopher-stone',
    name: '贤者之石',
    icon: '🔮',
    type: MaterialType.PRODUCT,
    description: '炼金术的终极产物，蕴含无尽力量',
    color: '#ff1493'
  }
]

export const RECIPES: Recipe[] = [
  {
    id: 'recipe-copper-ingot',
    name: '铜锭配方',
    outputId: 'copper-ingot',
    outputQuantity: 1,
    description: '火元素与铜矿融合，精炼出铜锭',
    parentIds: ['fire-element', 'copper-ore'],
    pattern: [
      null, { materialId: 'fire-element', quantity: 1, slotIndex: 1 }, null,
      null, { materialId: 'copper-ore', quantity: 1, slotIndex: 4 }, null,
      null, null, null
    ]
  },
  {
    id: 'recipe-crystal-gem',
    name: '水晶宝石配方',
    outputId: 'crystal-gem',
    outputQuantity: 1,
    description: '水与风的力量雕琢水晶原石',
    parentIds: ['water-element', 'wind-element', 'crystal-rough'],
    pattern: [
      { materialId: 'water-element', quantity: 1, slotIndex: 0 }, null, { materialId: 'wind-element', quantity: 1, slotIndex: 2 },
      null, { materialId: 'crystal-rough', quantity: 1, slotIndex: 4 }, null,
      null, null, null
    ]
  },
  {
    id: 'recipe-bronze-ingot',
    name: '青铜锭配方',
    outputId: 'bronze-ingot',
    outputQuantity: 2,
    description: '铜锭与银矿在火中熔合，形成青铜合金',
    parentIds: ['copper-ingot', 'silver-ore'],
    pattern: [
      { materialId: 'fire-element', quantity: 1, slotIndex: 0 }, null, null,
      { materialId: 'copper-ingot', quantity: 1, slotIndex: 3 }, { materialId: 'silver-ore', quantity: 1, slotIndex: 4 }, null,
      null, null, null
    ]
  },
  {
    id: 'recipe-healing-potion',
    name: '治疗药水配方',
    outputId: 'healing-potion',
    outputQuantity: 2,
    description: '水晶能量与草药精华调和而成的药水',
    parentIds: ['crystal-gem', 'herb'],
    pattern: [
      null, { materialId: 'water-element', quantity: 1, slotIndex: 1 }, null,
      { materialId: 'herb', quantity: 1, slotIndex: 3 }, { materialId: 'crystal-gem', quantity: 1, slotIndex: 4 }, null,
      null, null, null
    ]
  },
  {
    id: 'recipe-philosopher-stone',
    name: '贤者之石配方',
    outputId: 'philosopher-stone',
    outputQuantity: 1,
    description: '炼金术的终极奥秘，青铜与贤者之尘的升华',
    parentIds: ['bronze-ingot', 'sage-dust'],
    pattern: [
      { materialId: 'fire-element', quantity: 1, slotIndex: 0 }, { materialId: 'water-element', quantity: 1, slotIndex: 1 }, { materialId: 'wind-element', quantity: 1, slotIndex: 2 },
      null, { materialId: 'bronze-ingot', quantity: 1, slotIndex: 4 }, null,
      { materialId: 'earth-element', quantity: 1, slotIndex: 6 }, { materialId: 'sage-dust', quantity: 1, slotIndex: 7 }, null
    ]
  },
  {
    id: 'recipe-iron-refined',
    name: '精炼铁配方',
    outputId: 'iron-ore',
    outputQuantity: 2,
    description: '使用火元素提纯铁矿',
    parentIds: ['iron-ore', 'fire-element'],
    pattern: [
      null, { materialId: 'fire-element', quantity: 2, slotIndex: 1 }, null,
      null, { materialId: 'iron-ore', quantity: 1, slotIndex: 4 }, null,
      null, null, null
    ]
  },
  {
    id: 'recipe-strange-mixture',
    name: '奇异混合物配方',
    outputId: 'mushroom',
    outputQuantity: 3,
    description: '草药与蘑菇的奇妙反应',
    parentIds: ['herb', 'mushroom'],
    pattern: [
      null, null, null,
      { materialId: 'herb', quantity: 1, slotIndex: 3 }, { materialId: 'mushroom', quantity: 1, slotIndex: 4 }, { materialId: 'water-element', quantity: 1, slotIndex: 5 },
      null, null, null
    ]
  },
  {
    id: 'recipe-silver-purified',
    name: '纯银精华配方',
    outputId: 'silver-ore',
    outputQuantity: 2,
    description: '水晶能量净化银矿',
    parentIds: ['silver-ore', 'crystal-gem'],
    pattern: [
      null, { materialId: 'crystal-gem', quantity: 1, slotIndex: 1 }, null,
      { materialId: 'silver-ore', quantity: 1, slotIndex: 3 }, null, { materialId: 'silver-ore', quantity: 1, slotIndex: 5 },
      null, null, null
    ]
  }
]

export const INITIAL_INVENTORY: Record<string, number> = {
  'fire-element': 20,
  'water-element': 20,
  'earth-element': 20,
  'wind-element': 20,
  'iron-ore': 15,
  'copper-ore': 15,
  'silver-ore': 10,
  'herb': 12,
  'mushroom': 8,
  'crystal-rough': 10,
  'sage-dust': 3
}
