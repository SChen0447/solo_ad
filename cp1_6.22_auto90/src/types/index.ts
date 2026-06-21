export type WeaponQuality = 'low' | 'medium' | 'high';
export type WeaponType = 'sword' | 'shield' | 'helmet' | 'dragonbone_sword';
export type MaterialType = 'iron_ingot' | 'charcoal' | 'leather';
export type ForgeStage = 'idle' | 'heating' | 'heating_done' | 'hammering' | 'cooling' | 'done';

export interface Weapon {
  id: string;
  type: WeaponType;
  quality: WeaponQuality;
  createdAt: number;
  hammerStrokes: number;
  name: string;
}

export interface MaterialItem {
  type: MaterialType;
  name: string;
  icon: string;
}

export interface MaterialStock {
  stock: number;
  price: number;
  basePrice: number;
}

export interface PriceRecord {
  id: string;
  price: number;
  timestamp: number;
  quality: WeaponQuality;
  action?: string;
}

export interface PriceHistoryResponse {
  type: WeaponType;
  history: PriceRecord[];
  currentPrice: number;
  priceRange: { min: number; max: number };
}

export interface PlayerState {
  gold: number;
  level: number;
  forgeCount: number;
  inventory: Weapon[];
  materials: Record<MaterialType, number>;
  discoveredWeapons: Record<WeaponType, WeaponQuality | null>;
}

export interface ForgeResult {
  weapon: Weapon;
  quality: WeaponQuality;
  isLevelUp: boolean;
  newLevel: number;
}
