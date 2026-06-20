export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#a0a0a0',
  rare: '#4fc3f7',
  epic: '#ab47bc',
  legendary: '#ffa726',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

export interface Item {
  id?: string;
  name: string;
  icon: string;
  rarity: Rarity;
  description: string;
  quantity: number;
  type?: 'material' | 'weapon' | 'armor' | 'consumable' | 'accessory';
  attributes?: Record<string, number | string>;
  level?: number;
  createdAt?: number;
}

export interface Equipment extends Item {
  level: number;
  attributes: Record<string, number | string>;
  type: 'weapon' | 'armor' | 'accessory';
}

export interface Monster {
  id: string;
  name: string;
  icon: string;
}

export interface SimulateResult {
  monster: Monster;
  count: number;
  seed: string;
  drops: Item[];
}

export interface CraftResult {
  success: boolean;
  recipe?: string;
  result?: Item;
  rarity_color?: string;
  reason?: string;
  close_matches?: string[];
}

export interface UpgradeResult {
  success: boolean;
  reason?: string;
  success_rate?: number;
  required_gold?: number;
  equipment: Equipment;
  materials_consumed?: boolean;
}

export interface RecipeSummary {
  materials: Record<string, number>;
  result: {
    name: string;
    icon: string;
    rarity: Rarity;
    type: string;
  };
}
