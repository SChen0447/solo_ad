export interface Creature {
  id: number;
  name: string;
  type: 'grass' | 'fire' | 'water';
  hp: number;
  attack: number;
  defense: number;
  stars: number;
  emoji: string;
}

export interface PokedexEntry {
  id: number;
  seen: boolean;
  caught: boolean;
}

export type TileType = 'grass' | 'water' | 'rock';

export const CREATURES: Creature[] = [
  { id: 1, name: '妙蛙种子', type: 'grass', hp: 45, attack: 49, defense: 49, stars: 1, emoji: '🌱' },
  { id: 2, name: '妙蛙草', type: 'grass', hp: 60, attack: 62, defense: 63, stars: 2, emoji: '🌿' },
  { id: 3, name: '妙蛙花', type: 'grass', hp: 80, attack: 82, defense: 83, stars: 3, emoji: '🌸' },
  { id: 4, name: '小火龙', type: 'fire', hp: 39, attack: 52, defense: 43, stars: 1, emoji: '🔥' },
  { id: 5, name: '火恐龙', type: 'fire', hp: 58, attack: 64, defense: 58, stars: 2, emoji: '🦎' },
  { id: 6, name: '喷火龙', type: 'fire', hp: 78, attack: 84, defense: 78, stars: 3, emoji: '🐉' },
  { id: 7, name: '杰尼龟', type: 'water', hp: 44, attack: 48, defense: 65, stars: 1, emoji: '🐢' },
  { id: 8, name: '卡咪龟', type: 'water', hp: 59, attack: 63, defense: 80, stars: 2, emoji: '💧' },
  { id: 9, name: '水箭龟', type: 'water', hp: 79, attack: 83, defense: 100, stars: 3, emoji: '🌊' },
  { id: 10, name: '绿毛虫', type: 'grass', hp: 45, attack: 30, defense: 35, stars: 1, emoji: '🐛' },
  { id: 11, name: '铁甲蛹', type: 'grass', hp: 50, attack: 20, defense: 55, stars: 1, emoji: '🪨' },
  { id: 12, name: '巴大蝶', type: 'grass', hp: 60, attack: 45, defense: 50, stars: 2, emoji: '🦋' },
  { id: 13, name: '六尾', type: 'fire', hp: 38, attack: 41, defense: 40, stars: 1, emoji: '🦊' },
  { id: 14, name: '九尾', type: 'fire', hp: 73, attack: 76, defense: 75, stars: 3, emoji: '🔥' },
  { id: 15, name: '可达鸭', type: 'water', hp: 50, attack: 52, defense: 48, stars: 1, emoji: '🦆' },
  { id: 16, name: '哥达鸭', type: 'water', hp: 80, attack: 65, defense: 60, stars: 2, emoji: '🦆' },
  { id: 17, name: '走路草', type: 'grass', hp: 45, attack: 50, defense: 55, stars: 1, emoji: '🌾' },
  { id: 18, name: '臭臭花', type: 'grass', hp: 60, attack: 65, defense: 70, stars: 2, emoji: '🌺' },
  { id: 19, name: '霸王花', type: 'grass', hp: 75, attack: 80, defense: 85, stars: 3, emoji: '🌷' },
  { id: 20, name: '暴鲤龙', type: 'water', hp: 95, attack: 90, defense: 70, stars: 3, emoji: '🐲' },
];

export const MAP_TILES: TileType[][] = [
  ['grass', 'grass', 'rock', 'grass', 'water', 'water', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'grass', 'water', 'grass', 'grass', 'grass'],
  ['grass', 'rock', 'grass', 'grass', 'grass', 'grass', 'rock', 'grass'],
  ['grass', 'grass', 'grass', 'water', 'water', 'grass', 'grass', 'grass'],
  ['rock', 'grass', 'grass', 'water', 'water', 'grass', 'grass', 'rock'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'grass'],
  ['grass', 'rock', 'grass', 'grass', 'rock', 'grass', 'grass', 'grass'],
  ['grass', 'grass', 'grass', 'rock', 'grass', 'grass', 'grass', 'grass'],
];

export const TYPE_COLORS: Record<string, string> = {
  grass: '#78C850',
  fire: '#F08030',
  water: '#6890F0',
};

export const TILE_COLORS: Record<TileType, string> = {
  grass: '#7EC850',
  water: '#4A90D9',
  rock: '#9B9B9B',
};

export const getInitialPokedex = (): PokedexEntry[] => {
  return CREATURES.map(c => ({ id: c.id, seen: false, caught: false }));
};

export const getAllCreatures = (): Creature[] => {
  return CREATURES;
};

export const getCreatureById = (id: number): Creature | undefined => {
  return CREATURES.find(c => c.id === id);
};

export const getRandomCreature = (): Creature => {
  const randomIndex = Math.floor(Math.random() * CREATURES.length);
  return CREATURES[randomIndex];
};
