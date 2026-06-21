export interface Item {
  id: string;
  name: string;
  description: string;
  iconColor: string;
  iconSymbol: string;
  chapter: number;
  hint?: string;
}

export interface CombinationRule {
  items: [string, string];
  result: string;
  clueId?: string;
  message: string;
}

export const ITEMS: Record<string, Item> = {
  old_key: {
    id: 'old_key',
    name: '生锈的钥匙',
    description: '一把沾满铜绿的古老钥匙，钥匙柄上刻着奇怪的花纹。',
    iconColor: '#8B7355',
    iconSymbol: '🗝️',
    chapter: 1,
    hint: '也许能打开某扇尘封的门...',
  },
  torn_letter: {
    id: 'torn_letter',
    name: '残缺的信件',
    description: '一张被撕裂的羊皮纸信件，上面隐约可见"花园"二字。',
    iconColor: '#F5DEB3',
    iconSymbol: '📜',
    chapter: 1,
    hint: '另一半在哪里呢？',
  },
  candle: {
    id: 'candle',
    name: '半截蜡烛',
    description: '剩下半截的蜡烛，蜡油已经凝固成奇怪的形状。',
    iconColor: '#FFD700',
    iconSymbol: '🕯️',
    chapter: 1,
  },
  magnifier: {
    id: 'magnifier',
    name: '放大镜',
    description: '黄铜边框的放大镜，镜片有些模糊但仍能使用。',
    iconColor: '#B8860B',
    iconSymbol: '🔍',
    chapter: 1,
    hint: '仔细观察也许能发现更多。',
  },
  crystal_shard: {
    id: 'crystal_shard',
    name: '水晶碎片',
    description: '泛着淡蓝色光芒的水晶碎片，触摸时能感受到微微的寒意。',
    iconColor: '#87CEEB',
    iconSymbol: '💎',
    chapter: 2,
  },
  ancient_map: {
    id: 'ancient_map',
    name: '古老地图',
    description: '一张泛黄的羊皮地图，上面标注着奇怪的符号和路线。',
    iconColor: '#D2B48C',
    iconSymbol: '🗺️',
    chapter: 2,
    hint: '地图指向的是什么地方？',
  },
  water_flask: {
    id: 'water_flask',
    name: '装水的烧瓶',
    description: '玻璃烧瓶中装着清澈的液体，轻轻摇晃会泛起涟漪。',
    iconColor: '#4682B4',
    iconSymbol: '🧪',
    chapter: 2,
  },
  phoenix_feather: {
    id: 'phoenix_feather',
    name: '凤凰羽毛',
    description: '一根火红中透着金芒的羽毛，触手温暖。',
    iconColor: '#FF4500',
    iconSymbol: '🪶',
    chapter: 3,
  },
  silver_amulet: {
    id: 'silver_amulet',
    name: '白银护符',
    description: '一枚刻有古老符文的银色护符，散发着柔和的光芒。',
    iconColor: '#C0C0C0',
    iconSymbol: '📿',
    chapter: 3,
    hint: '符文似乎在低声吟唱...',
  },
  shadow_cloak: {
    id: 'shadow_cloak',
    name: '暗影斗篷',
    description: '一件几乎能吸收光线的黑色斗篷，布料轻盈如雾。',
    iconColor: '#2F4F4F',
    iconSymbol: '🧥',
    chapter: 3,
  },
  hidden_garden_key: {
    id: 'hidden_garden_key',
    name: '花园密匙',
    description: '将信件与放大镜结合后，浮现出的隐秘钥匙图案。',
    iconColor: '#228B22',
    iconSymbol: '🌿',
    chapter: 1,
  },
  treasure_location: {
    id: 'treasure_location',
    name: '宝藏坐标',
    description: '水晶碎片在地图上显现的神秘位置标记。',
    iconColor: '#9370DB',
    iconSymbol: '📍',
    chapter: 2,
  },
  ritual_blessing: {
    id: 'ritual_blessing',
    name: '仪式祝福',
    description: '凤凰羽毛与白银护符融合产生的神圣祝福。',
    iconColor: '#FFD700',
    iconSymbol: '✨',
    chapter: 3,
  },
};

export const COMBINATION_RULES: CombinationRule[] = [
  {
    items: ['torn_letter', 'magnifier'],
    result: 'hidden_garden_key',
    clueId: 'ch1_garden_clue',
    message: '放大镜下，信件的折痕处浮现出一把绿色小钥匙的轮廓...',
  },
  {
    items: ['crystal_shard', 'ancient_map'],
    result: 'treasure_location',
    clueId: 'ch2_treasure_clue',
    message: '水晶碎片贴近地图，蓝色光芒在某处汇聚成一个光点...',
  },
  {
    items: ['phoenix_feather', 'silver_amulet'],
    result: 'ritual_blessing',
    clueId: 'ch3_ritual_clue',
    message: '凤凰羽毛与白银护符交相辉映，一股温暖的力量注入你的体内...',
  },
];

export function findCombination(item1: string, item2: string): CombinationRule | null {
  return (
    COMBINATION_RULES.find(
      (rule) =>
        (rule.items[0] === item1 && rule.items[1] === item2) ||
        (rule.items[0] === item2 && rule.items[1] === item1)
    ) || null
  );
}

export function getItemsByChapter(chapter: number): Item[] {
  return Object.values(ITEMS).filter((item) => item.chapter === chapter);
}
