import type { PlayerState, Weapon, WeaponType, WeaponQuality, MaterialType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'medieval_forge_state';

const WEAPON_NAMES: Record<WeaponType, string> = {
  sword: '长剑',
  shield: '圆盾',
  helmet: '铁盔',
  dragonbone_sword: '龙骨剑'
};

const QUALITY_COLORS: Record<WeaponQuality, string> = {
  low: '#a0aec0',
  medium: '#e2e8f0',
  high: '#d69e2e'
};

const QUALITY_NAMES: Record<WeaponQuality, string> = {
  low: '低品质',
  medium: '中等品质',
  high: '高品质'
};

export const getWeaponName = (type: WeaponType): string => WEAPON_NAMES[type];
export const getQualityColor = (q: WeaponQuality): string => QUALITY_COLORS[q];
export const getQualityName = (q: WeaponQuality): string => QUALITY_NAMES[q];

const defaultState: PlayerState = {
  gold: 500,
  level: 1,
  forgeCount: 0,
  inventory: [],
  materials: {
    iron_ingot: 10,
    charcoal: 15,
    leather: 8
  },
  discoveredWeapons: {
    sword: null,
    shield: null,
    helmet: null,
    dragonbone_sword: null
  }
};

export function loadState(): PlayerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return { ...defaultState };
}

export function saveState(state: PlayerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function createWeapon(type: WeaponType, quality: WeaponQuality, strokes: number): Weapon {
  return {
    id: uuidv4(),
    type,
    quality,
    createdAt: Date.now(),
    hammerStrokes: strokes,
    name: WEAPON_NAMES[type]
  };
}

export function canForgeDragonbone(level: number): boolean {
  return level >= 3;
}

export function getForgeCountForNextLevel(currentLevel: number): number {
  return currentLevel * 10;
}

export const MATERIAL_NAMES: Record<MaterialType, string> = {
  iron_ingot: '铁锭',
  charcoal: '木炭',
  leather: '皮革'
};

export const MATERIAL_ICONS: Record<MaterialType, string> = {
  iron_ingot: '⛓️',
  charcoal: '⬛',
  leather: '🟫'
};
