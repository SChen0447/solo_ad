export type Element = 'fire' | 'water' | 'wind' | 'light' | 'dark';
export type CardType = 'attack' | 'defense' | 'support';

export interface CardData {
  id: string;
  name: string;
  element: Element;
  type: CardType;
  cost: number;
  attack: number;
  health: number;
  skill: string;
  skillDesc: string;
}

export interface CardInstance extends CardData {
  instanceId: string;
  currentHealth: number;
  currentAttack: number;
  canAttack: boolean;
  hasAttacked: boolean;
  justSummoned: boolean;
}

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#e63946',
  water: '#457b9d',
  wind: '#a8dadc',
  light: '#f4a261',
  dark: '#6c5b7b'
};

export const ELEMENT_NAMES: Record<Element, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  light: '光',
  dark: '暗'
};

export const TYPE_NAMES: Record<CardType, string> = {
  attack: '攻击型',
  defense: '防御型',
  support: '辅助型'
};

export const ELEMENT_ADVANTAGE: Record<Element, Element> = {
  fire: 'wind',
  wind: 'water',
  water: 'fire',
  light: 'dark',
  dark: 'light'
};

export function hasAdvantage(attacker: Element, defender: Element): boolean {
  if (attacker === 'light' && defender === 'dark') return true;
  if (attacker === 'dark' && defender === 'light') return true;
  return ELEMENT_ADVANTAGE[attacker] === defender;
}

export const ALL_CARDS: CardData[] = [
  { id: 'fire_1', name: '烈焰战士', element: 'fire', type: 'attack', cost: 2, attack: 4, health: 3, skill: '灼热打击', skillDesc: '造成伤害时附加1点燃烧伤害' },
  { id: 'fire_2', name: '炎龙法师', element: 'fire', type: 'attack', cost: 4, attack: 5, health: 4, skill: '火焰吐息', skillDesc: '攻击时对相邻敌方造成1点伤害' },
  { id: 'fire_3', name: '火焰守卫', element: 'fire', type: 'defense', cost: 3, attack: 2, health: 6, skill: '烈焰护盾', skillDesc: '首次受到伤害时反弹2点伤害' },
  { id: 'fire_4', name: '火元素', element: 'fire', type: 'attack', cost: 1, attack: 2, health: 2, skill: '引燃', skillDesc: '召唤时对随机敌方造成1点伤害' },
  { id: 'fire_5', name: '熔岩巨人', element: 'fire', type: 'attack', cost: 6, attack: 7, health: 6, skill: '熔岩爆发', skillDesc: '攻击时对所有敌方造成1点伤害' },
  { id: 'fire_6', name: '火焰祭司', element: 'fire', type: 'support', cost: 3, attack: 2, health: 4, skill: '烈焰祝福', skillDesc: '己方火属性卡牌攻击力+1' },
  { id: 'fire_7', name: '爆炎使者', element: 'fire', type: 'attack', cost: 5, attack: 6, health: 4, skill: '爆炎', skillDesc: '攻击附带穿刺效果' },
  { id: 'fire_8', name: '凤凰雏鸟', element: 'fire', type: 'defense', cost: 2, attack: 1, health: 3, skill: '涅槃', skillDesc: '死亡时有30%概率复活' },
  { id: 'water_1', name: '海潮行者', element: 'water', type: 'attack', cost: 2, attack: 3, health: 4, skill: '潮汐冲击', skillDesc: '攻击后恢复1点生命' },
  { id: 'water_2', name: '冰霜法师', element: 'water', type: 'attack', cost: 4, attack: 4, health: 5, skill: '冰冻术', skillDesc: '30%概率使目标跳过一回合' },
  { id: 'water_3', name: '深海守卫', element: 'water', type: 'defense', cost: 3, attack: 2, health: 7, skill: '水之壁垒', skillDesc: '受到伤害减少1点' },
  { id: 'water_4', name: '水精灵', element: 'water', type: 'support', cost: 1, attack: 1, health: 2, skill: '治愈之泉', skillDesc: '每回合恢复己方1点生命' },
  { id: 'water_5', name: '海妖', element: 'water', type: 'attack', cost: 5, attack: 5, health: 5, skill: '诱惑之歌', skillDesc: '20%概率控制敌方卡牌一回合' },
  { id: 'water_6', name: '潮汐祭司', element: 'water', type: 'support', cost: 3, attack: 2, health: 4, skill: '海潮祝福', skillDesc: '己方水属性卡牌生命值+2' },
  { id: 'water_7', name: '寒冰巨人', element: 'water', type: 'defense', cost: 6, attack: 4, health: 8, skill: '极寒领域', skillDesc: '敌方所有卡牌攻击力-1' },
  { id: 'water_8', name: '浪花刺客', element: 'water', type: 'attack', cost: 2, attack: 4, health: 2, skill: '突袭', skillDesc: '召唤当回合可立即攻击' },
  { id: 'wind_1', name: '疾风剑士', element: 'wind', type: 'attack', cost: 2, attack: 4, health: 2, skill: '疾风斩', skillDesc: '30%概率攻击两次' },
  { id: 'wind_2', name: '风暴法师', element: 'wind', type: 'attack', cost: 4, attack: 5, health: 3, skill: '龙卷风', skillDesc: '攻击时对随机另一敌方造成2点伤害' },
  { id: 'wind_3', name: '风之守护者', element: 'wind', type: 'defense', cost: 3, attack: 2, health: 5, skill: '疾风护盾', skillDesc: '25%概率闪避攻击' },
  { id: 'wind_4', name: '风精灵', element: 'wind', type: 'support', cost: 1, attack: 2, health: 1, skill: '疾风之力', skillDesc: '己方风属性卡牌速度+1' },
  { id: 'wind_5', name: '雷鸟', element: 'wind', type: 'attack', cost: 5, attack: 6, health: 4, skill: '闪电突袭', skillDesc: '40%概率造成双倍伤害' },
  { id: 'wind_6', name: '风暴祭司', element: 'wind', type: 'support', cost: 3, attack: 2, health: 3, skill: '风暴祝福', skillDesc: '己方风属性卡牌闪避率+15%' },
  { id: 'wind_7', name: '天空骑士', element: 'wind', type: 'attack', cost: 4, attack: 5, health: 4, skill: '俯冲', skillDesc: '首次攻击造成额外2点伤害' },
  { id: 'wind_8', name: '藤蔓缠绕者', element: 'wind', type: 'defense', cost: 2, attack: 1, health: 5, skill: '缠绕', skillDesc: '20%概率使目标无法攻击' },
  { id: 'light_1', name: '圣光骑士', element: 'light', type: 'attack', cost: 3, attack: 4, health: 4, skill: '神圣打击', skillDesc: '对暗属性卡牌造成双倍伤害' },
  { id: 'light_2', name: '光明法师', element: 'light', type: 'attack', cost: 4, attack: 4, health: 5, skill: '神圣光芒', skillDesc: '攻击后治疗己方1点生命' },
  { id: 'light_3', name: '圣殿守卫', element: 'light', type: 'defense', cost: 3, attack: 2, health: 6, skill: '神圣护盾', skillDesc: '首次受到伤害时免疫' },
  { id: 'light_4', name: '光精灵', element: 'light', type: 'support', cost: 1, attack: 1, health: 2, skill: '圣光治愈', skillDesc: '召唤时治疗己方所有卡牌1点' },
  { id: 'light_5', name: '天使', element: 'light', type: 'support', cost: 6, attack: 4, health: 6, skill: '神圣复活', skillDesc: '死亡时复活一张己方卡牌' },
  { id: 'light_6', name: '光明祭司', element: 'light', type: 'support', cost: 3, attack: 2, health: 4, skill: '圣光祝福', skillDesc: '己方所有卡牌生命值+1' },
  { id: 'light_7', name: '审判者', element: 'light', type: 'attack', cost: 5, attack: 6, health: 5, skill: '神圣审判', skillDesc: '30%概率直接消灭目标' },
  { id: 'light_8', name: '晨曦使者', element: 'light', type: 'attack', cost: 2, attack: 3, health: 3, skill: '黎明之光', skillDesc: '召唤时抽一张牌' },
  { id: 'dark_1', name: '暗影刺客', element: 'dark', type: 'attack', cost: 2, attack: 5, health: 2, skill: '暗影突袭', skillDesc: '召唤当回合可立即攻击' },
  { id: 'dark_2', name: '死灵法师', element: 'dark', type: 'attack', cost: 4, attack: 4, health: 4, skill: '亡灵召唤', skillDesc: '死亡时召唤一个2/2骷髅' },
  { id: 'dark_3', name: '暗黑骑士', element: 'dark', type: 'defense', cost: 3, attack: 3, health: 5, skill: '吸血', skillDesc: '造成伤害时恢复等量生命' },
  { id: 'dark_4', name: '暗影精灵', element: 'dark', type: 'support', cost: 1, attack: 2, health: 1, skill: '暗影之力', skillDesc: '己方暗属性卡牌攻击力+1' },
  { id: 'dark_5', name: '恶魔领主', element: 'dark', type: 'attack', cost: 6, attack: 7, health: 6, skill: '黑暗吞噬', skillDesc: '消灭目标时攻击力+2' },
  { id: 'dark_6', name: '暗黑祭司', element: 'dark', type: 'support', cost: 3, attack: 2, health: 4, skill: '黑暗祝福', skillDesc: '己方暗属性卡牌攻击力+1' },
  { id: 'dark_7', name: '幽灵', element: 'dark', type: 'attack', cost: 2, attack: 3, health: 2, skill: '幽灵之身', skillDesc: '30%概率闪避攻击' },
  { id: 'dark_8', name: '末日使者', element: 'dark', type: 'attack', cost: 5, attack: 5, health: 5, skill: '末日降临', skillDesc: '20%概率对所有敌方造成2点伤害' }
];

export function getCardById(id: string): CardData | undefined {
  return ALL_CARDS.find(c => c.id === id);
}

export function createCardInstance(cardData: CardData, index: number): CardInstance {
  return {
    ...cardData,
    instanceId: `${cardData.id}_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    currentHealth: cardData.health,
    currentAttack: cardData.attack,
    canAttack: false,
    hasAttacked: false,
    justSummoned: true
  };
}

export function getDefaultDeck(): string[] {
  const deck: string[] = [];
  const elements: Element[] = ['fire', 'water', 'wind', 'light', 'dark'];
  elements.forEach(element => {
    for (let i = 1; i <= 6; i++) {
      deck.push(`${element}_${i}`);
    }
  });
  return deck;
}
