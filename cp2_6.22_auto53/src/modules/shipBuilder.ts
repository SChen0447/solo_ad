export type PartType = 'engine' | 'armor' | 'weapon' | 'paint';

export type Rarity = 'common' | 'rare' | 'legendary';

export interface Part {
  id: string;
  name: string;
  type: PartType;
  rarity: Rarity;
  description: string;
  stats: {
    speed?: number;
    durability?: number;
    firepower?: number;
  };
  color: string;
}

export interface ShipConfig {
  engine: Part | null;
  armor: Part | null;
  weapon: Part | null;
  paint: Part | null;
}

export interface ShipStats {
  speed: number;
  durability: number;
  firepower: number;
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#94A3B8',
  rare: '#818CF8',
  legendary: '#FBBF24'
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传说'
};

export const PART_TYPES: Record<PartType, string> = {
  engine: '引擎',
  armor: '护甲',
  weapon: '武器',
  paint: '涂装'
};

export const PARTS_LIBRARY: Part[] = [
  { id: 'engine-1', name: '基础推进器', type: 'engine', rarity: 'common', description: '标准推进装置，提供基础速度', stats: { speed: 20 }, color: '#64748B' },
  { id: 'engine-2', name: '离子引擎', type: 'engine', rarity: 'rare', description: '高效离子推进系统，速度大幅提升', stats: { speed: 35 }, color: '#60A5FA' },
  { id: 'engine-3', name: '量子跃迁引擎', type: 'engine', rarity: 'legendary', description: '最先进的跃迁技术，极速体验', stats: { speed: 50 }, color: '#A78BFA' },
  { id: 'engine-4', name: '涡轮引擎', type: 'engine', rarity: 'common', description: '涡轮式推进，平衡型选择', stats: { speed: 25 }, color: '#475569' },

  { id: 'armor-1', name: '钛合金装甲', type: 'armor', rarity: 'common', description: '基础装甲，提供标准防护', stats: { durability: 25 }, color: '#94A3B8' },
  { id: 'armor-2', name: '能量护盾', type: 'armor', rarity: 'rare', description: '能量护盾系统，高耐久度', stats: { durability: 40 }, color: '#22D3EE' },
  { id: 'armor-3', name: '纳米修复装甲', type: 'armor', rarity: 'legendary', description: '自动修复的纳米装甲，极致防护', stats: { durability: 60 }, color: '#34D399' },
  { id: 'armor-4', name: '钢板护甲', type: 'armor', rarity: 'common', description: '厚重钢板，防御尚可', stats: { durability: 20 }, color: '#6B7280' },

  { id: 'weapon-1', name: '激光炮', type: 'weapon', rarity: 'common', description: '标准激光武器', stats: { firepower: 20 }, color: '#EF4444' },
  { id: 'weapon-2', name: '等离子炮', type: 'weapon', rarity: 'rare', description: '等离子武器，火力强劲', stats: { firepower: 35 }, color: '#F97316' },
  { id: 'weapon-3', name: '反物质炮', type: 'weapon', rarity: 'legendary', description: '毁灭性武器，火力爆表', stats: { firepower: 55 }, color: '#EC4899' },
  { id: 'weapon-4', name: '机关枪', type: 'weapon', rarity: 'common', description: '速射武器，火力一般', stats: { firepower: 15 }, color: '#DC2626' },

  { id: 'paint-1', name: '标准银', type: 'paint', rarity: 'common', description: '银色涂装，经典外观', stats: {}, color: '#CBD5E1' },
  { id: 'paint-2', name: '星空蓝', type: 'paint', rarity: 'rare', description: '深蓝色渐变涂装，炫酷外观', stats: { speed: 5 }, color: '#3B82F6' },
  { id: 'paint-3', name: '黄金涂装', type: 'paint', rarity: 'legendary', description: '金色传说涂装，全属性加成', stats: { speed: 5, durability: 5, firepower: 5 }, color: '#FBBF24' },
  { id: 'paint-4', name: '暗夜黑', type: 'paint', rarity: 'common', description: '黑色涂装，低调内敛', stats: {}, color: '#1F2937' },
  { id: 'paint-5', name: '烈焰红', type: 'paint', rarity: 'rare', description: '火焰红色涂装，火力加成', stats: { firepower: 8 }, color: '#EF4444' },
  { id: 'paint-6', name: '翡翠绿', type: 'paint', rarity: 'rare', description: '翠绿色涂装，耐久加成', stats: { durability: 8 }, color: '#10B981' },
];

export function getRarityColor(rarity: Rarity): string {
  return RARITY_COLORS[rarity];
}

export function createEmptyShipConfig(): ShipConfig {
  return {
    engine: null,
    armor: null,
    weapon: null,
    paint: null
  };
}

export function installPart(config: ShipConfig, part: Part): ShipConfig {
  return {
    ...config,
    [part.type]: part
  };
}

export function uninstallPart(config: ShipConfig, slotType: PartType): ShipConfig {
  return {
    ...config,
    [slotType]: null
  };
}

export function calculateShipStats(config: ShipConfig): ShipStats {
  const baseStats: ShipStats = {
    speed: 30,
    durability: 30,
    firepower: 30
  };

  const parts = [config.engine, config.armor, config.weapon, config.paint].filter(Boolean) as Part[];

  for (const part of parts) {
    if (part.stats.speed) baseStats.speed += part.stats.speed;
    if (part.stats.durability) baseStats.durability += part.stats.durability;
    if (part.stats.firepower) baseStats.firepower += part.stats.firepower;
  }

  baseStats.speed = Math.min(100, Math.max(0, baseStats.speed));
  baseStats.durability = Math.min(100, Math.max(0, baseStats.durability));
  baseStats.firepower = Math.min(100, Math.max(0, baseStats.firepower));

  return baseStats;
}

export function getPartsByType(type: PartType): Part[] {
  return PARTS_LIBRARY.filter(p => p.type === type);
}

export function getStatColor(value: number): string {
  const ratio = value / 100;
  if (ratio >= 0.7) return '#22C55E';
  if (ratio >= 0.4) return '#EAB308';
  return '#EF4444';
}
