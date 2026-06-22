export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type CardEffectType = 'damage' | 'heal' | 'armor' | 'draw';

export interface CardEffect {
  type: CardEffectType;
  value: number;
}

export interface Card {
  id: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
  rarity: Rarity;
  description: string;
  effects: CardEffect[];
}

export interface CardInstance {
  instanceId: string;
  card: Card;
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};

export const RARITY_NAMES: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
};

export const CARD_POOL: Card[] = [
  {
    id: 'card_001',
    name: '新兵战士',
    cost: 1,
    attack: 2,
    health: 1,
    rarity: 'common',
    description: '普通的战士，英勇无畏。',
    effects: [{ type: 'damage', value: 2 }]
  },
  {
    id: 'card_002',
    name: '治疗药水',
    cost: 1,
    attack: 0,
    health: 0,
    rarity: 'common',
    description: '恢复3点生命值。',
    effects: [{ type: 'heal', value: 3 }]
  },
  {
    id: 'card_003',
    name: '轻甲护盾',
    cost: 1,
    attack: 0,
    health: 0,
    rarity: 'common',
    description: '获得3点护甲。',
    effects: [{ type: 'armor', value: 3 }]
  },
  {
    id: 'card_004',
    name: '侦察兵',
    cost: 2,
    attack: 2,
    health: 2,
    rarity: 'common',
    description: '快速的侦察单位。',
    effects: [{ type: 'damage', value: 2 }]
  },
  {
    id: 'card_005',
    name: '短弓射手',
    cost: 2,
    attack: 3,
    health: 1,
    rarity: 'common',
    description: '远程攻击，造成3点伤害。',
    effects: [{ type: 'damage', value: 3 }]
  },
  {
    id: 'card_006',
    name: '护盾兵',
    cost: 2,
    attack: 1,
    health: 4,
    rarity: 'common',
    description: '坚固的防御单位。',
    effects: [{ type: 'damage', value: 1 }, { type: 'armor', value: 2 }]
  },
  {
    id: 'card_007',
    name: '战术指令',
    cost: 2,
    attack: 0,
    health: 0,
    rarity: 'common',
    description: '抽1张牌。',
    effects: [{ type: 'draw', value: 1 }]
  },
  {
    id: 'card_008',
    name: '重甲骑士',
    cost: 3,
    attack: 3,
    health: 4,
    rarity: 'rare',
    description: '精锐骑士，攻守兼备。',
    effects: [{ type: 'damage', value: 3 }, { type: 'armor', value: 2 }]
  },
  {
    id: 'card_009',
    name: '法师学徒',
    cost: 3,
    attack: 4,
    health: 2,
    rarity: 'rare',
    description: '造成4点魔法伤害。',
    effects: [{ type: 'damage', value: 4 }]
  },
  {
    id: 'card_010',
    name: '恢复圣光',
    cost: 3,
    attack: 0,
    health: 0,
    rarity: 'rare',
    description: '恢复6点生命值。',
    effects: [{ type: 'heal', value: 6 }]
  },
  {
    id: 'card_011',
    name: '铁壁防御',
    cost: 3,
    attack: 0,
    health: 0,
    rarity: 'rare',
    description: '获得7点护甲。',
    effects: [{ type: 'armor', value: 7 }]
  },
  {
    id: 'card_012',
    name: '双剑刺客',
    cost: 3,
    attack: 5,
    health: 2,
    rarity: 'rare',
    description: '高伤害刺客。',
    effects: [{ type: 'damage', value: 5 }]
  },
  {
    id: 'card_013',
    name: '战斗号角',
    cost: 3,
    attack: 0,
    health: 0,
    rarity: 'rare',
    description: '抽2张牌。',
    effects: [{ type: 'draw', value: 2 }]
  },
  {
    id: 'card_014',
    name: '烈焰法师',
    cost: 4,
    attack: 5,
    health: 3,
    rarity: 'rare',
    description: '释放烈焰造成5点伤害。',
    effects: [{ type: 'damage', value: 5 }]
  },
  {
    id: 'card_015',
    name: '圣殿守卫',
    cost: 4,
    attack: 2,
    health: 6,
    rarity: 'epic',
    description: '神圣的守卫者。',
    effects: [{ type: 'damage', value: 2 }, { type: 'armor', value: 4 }]
  },
  {
    id: 'card_016',
    name: '暗影刺客',
    cost: 4,
    attack: 7,
    health: 2,
    rarity: 'epic',
    description: '致命一击，造成7点伤害。',
    effects: [{ type: 'damage', value: 7 }]
  },
  {
    id: 'card_017',
    name: '神圣治愈',
    cost: 4,
    attack: 0,
    health: 0,
    rarity: 'epic',
    description: '恢复10点生命值。',
    effects: [{ type: 'heal', value: 10 }]
  },
  {
    id: 'card_018',
    name: '秘银护甲',
    cost: 4,
    attack: 0,
    health: 0,
    rarity: 'epic',
    description: '获得10点护甲。',
    effects: [{ type: 'armor', value: 10 }]
  },
  {
    id: 'card_019',
    name: '指挥官',
    cost: 5,
    attack: 4,
    health: 5,
    rarity: 'epic',
    description: '战场指挥官，激励士气。',
    effects: [{ type: 'damage', value: 4 }, { type: 'draw', value: 1 }]
  },
  {
    id: 'card_020',
    name: '雷霆术士',
    cost: 5,
    attack: 6,
    health: 4,
    rarity: 'epic',
    description: '召唤雷电造成6点伤害。',
    effects: [{ type: 'damage', value: 6 }]
  },
  {
    id: 'card_021',
    name: '圣光术',
    cost: 5,
    attack: 0,
    health: 0,
    rarity: 'epic',
    description: '恢复8点生命并获得5点护甲。',
    effects: [{ type: 'heal', value: 8 }, { type: 'armor', value: 5 }]
  },
  {
    id: 'card_022',
    name: '巨龙骑士',
    cost: 6,
    attack: 6,
    health: 6,
    rarity: 'legendary',
    description: '传说中的龙骑士。',
    effects: [{ type: 'damage', value: 6 }, { type: 'armor', value: 3 }]
  },
  {
    id: 'card_023',
    name: '末日法师',
    cost: 6,
    attack: 9,
    health: 3,
    rarity: 'legendary',
    description: '释放毁灭性魔法造成9点伤害。',
    effects: [{ type: 'damage', value: 9 }]
  },
  {
    id: 'card_024',
    name: '生命之泉',
    cost: 6,
    attack: 0,
    health: 0,
    rarity: 'legendary',
    description: '恢复15点生命值。',
    effects: [{ type: 'heal', value: 15 }]
  },
  {
    id: 'card_025',
    name: '不灭壁垒',
    cost: 6,
    attack: 0,
    health: 0,
    rarity: 'legendary',
    description: '获得15点护甲。',
    effects: [{ type: 'armor', value: 15 }]
  },
  {
    id: 'card_026',
    name: '战争领主',
    cost: 7,
    attack: 7,
    health: 7,
    rarity: 'legendary',
    description: '战场上的绝对统治者。',
    effects: [{ type: 'damage', value: 7 }, { type: 'armor', value: 5 }]
  },
  {
    id: 'card_027',
    name: '大魔导师',
    cost: 7,
    attack: 8,
    health: 5,
    rarity: 'legendary',
    description: '精通所有魔法的贤者。',
    effects: [{ type: 'damage', value: 8 }, { type: 'draw', value: 2 }]
  },
  {
    id: 'card_028',
    name: '毁灭之锤',
    cost: 8,
    attack: 10,
    health: 4,
    rarity: 'legendary',
    description: '传说神器，造成10点伤害。',
    effects: [{ type: 'damage', value: 10 }]
  },
  {
    id: 'card_029',
    name: '远古守护者',
    cost: 9,
    attack: 8,
    health: 10,
    rarity: 'legendary',
    description: '远古时代的守护者。',
    effects: [{ type: 'damage', value: 8 }, { type: 'armor', value: 8 }]
  },
  {
    id: 'card_030',
    name: '终极毁灭',
    cost: 10,
    attack: 15,
    health: 0,
    rarity: 'legendary',
    description: '终极法术，造成15点毁灭性伤害。',
    effects: [{ type: 'damage', value: 15 }]
  }
];
