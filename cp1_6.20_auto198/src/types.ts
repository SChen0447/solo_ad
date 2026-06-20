export enum RuneType {
  FIRE = 'fire',
  WATER = 'water',
  WIND = 'wind',
  EARTH = 'earth',
  LIGHT = 'light',
  DARK = 'dark'
}

export interface Rune {
  id: string;
  type: RuneType;
  name: string;
  color: string;
}

export interface ItemShape {
  type: 'staff' | 'sword' | 'shield' | 'potion' | 'ring' | 'amulet' | 'crystal' | 'book';
  parts: string[];
}

export interface MagicItem {
  id: string;
  name: string;
  runes: RuneType[];
  shape: ItemShape;
  color: string;
  power: number;
  level: number;
  position?: { x: number; y: number; z: number };
  isPlaced?: boolean;
}

export interface CombinationRule {
  runes: RuneType[];
  itemName: string;
  shape: ItemShape;
  power: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface CraftRequest {
  runes: RuneType[];
}

export interface CraftResponse {
  success: boolean;
  item?: MagicItem;
  message?: string;
}

export interface UpgradeRequest {
  item1Id: string;
  item2Id: string;
}

export interface UpgradeResponse {
  success: boolean;
  item?: MagicItem;
  message?: string;
}

export interface InventoryResponse {
  items: MagicItem[];
  gold: number;
}
