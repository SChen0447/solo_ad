export type EquipmentType = 'weapon' | 'helmet' | 'armor' | 'boots';
export type Quality = 'common' | 'rare' | 'epic' | 'legendary';

export interface IEquipment {
  id: string;
  name: string;
  type: EquipmentType;
  quality: Quality;
  bonus: {
    atk?: number;
    def?: number;
    spd?: number;
    hp?: number;
    matk?: number;
  };
}

export const QUALITY_CONFIG: Record<Quality, {
  name: string;
  color: string;
  dropRate: number;
  multiplier: [number, number];
}> = {
  common: { name: '普通', color: '#9E9E9E', dropRate: 0.60, multiplier: [1, 3] },
  rare: { name: '稀有', color: '#2196F3', dropRate: 0.25, multiplier: [3, 7] },
  epic: { name: '史诗', color: '#9C27B0', dropRate: 0.12, multiplier: [6, 12] },
  legendary: { name: '传说', color: '#FF9800', dropRate: 0.03, multiplier: [10, 20] },
};

export const EQUIPMENT_CONFIG: Record<EquipmentType, {
  label: string;
  names: string[];
  bonusKeys: (keyof IEquipment['bonus'])[];
}> = {
  weapon: {
    label: '武器',
    names: ['铁剑', '战斧', '长弓', '法杖', '匕首', '巨锤', '双刀', '魔法书'],
    bonusKeys: ['atk', 'matk', 'spd'],
  },
  helmet: {
    label: '头盔',
    names: ['铁盔', '皮帽', '法师冠', '兜帽', '王冠', '龙鳞盔'],
    bonusKeys: ['def', 'hp', 'matk'],
  },
  armor: {
    label: '铠甲',
    names: ['锁子甲', '皮甲', '法袍', '板甲', '龙鳞甲', '隐身衣'],
    bonusKeys: ['def', 'hp', 'atk'],
  },
  boots: {
    label: '靴子',
    names: ['皮靴', '铁靴', '疾风靴', '魔法鞋', '龙皮靴', '暗影靴'],
    bonusKeys: ['spd', 'def', 'hp'],
  },
};

export const INVENTORY_LIMIT = 10;

function pickQuality(): Quality {
  const r = Math.random();
  let acc = 0;
  const order: Quality[] = ['legendary', 'epic', 'rare', 'common'];
  for (const q of order) {
    acc += QUALITY_CONFIG[q].dropRate;
    if (r <= acc) return q;
  }
  return 'common';
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function generateEquipment(monsterLevel: number = 1, forceType?: EquipmentType): IEquipment {
  const types: EquipmentType[] = ['weapon', 'helmet', 'armor', 'boots'];
  const type = forceType || types[randInt(0, 3)];
  const quality = pickQuality();
  const cfg = EQUIPMENT_CONFIG[type];
  const qCfg = QUALITY_CONFIG[quality];
  const name = cfg.names[randInt(0, cfg.names.length - 1)];
  const [minM, maxM] = qCfg.multiplier;
  const lvlMul = 1 + (monsterLevel - 1) * 0.2;
  const bonus: IEquipment['bonus'] = {};
  const primaryKey = cfg.bonusKeys[0];
  bonus[primaryKey] = Math.round(randInt(minM, maxM) * lvlMul);
  if (quality !== 'common') {
    const secondary = cfg.bonusKeys[randInt(1, cfg.bonusKeys.length - 1)];
    if (secondary && secondary !== primaryKey) {
      bonus[secondary] = Math.round(randInt(Math.max(1, minM - 1), Math.max(1, maxM - 2)) * lvlMul);
    }
  }
  if (quality === 'legendary' || quality === 'epic') {
    if (Math.random() < 0.5) {
      const extra: (keyof IEquipment['bonus'])[] = ['hp', 'def', 'atk', 'spd', 'matk'];
      const ek = extra[randInt(0, 4)];
      if (!bonus[ek]) bonus[ek] = Math.round(randInt(2, 5) * lvlMul);
    }
  }
  const prefix = qCfg.name;
  return {
    id: genId(),
    name: `【${prefix}】${name}`,
    type,
    quality,
    bonus,
  };
}

export function equipItem(
  hero: any,
  equipment: IEquipment
): { hero: any; replaced: IEquipment | null; inventoryFull: boolean } {
  const h: any = JSON.parse(JSON.stringify(hero));
  const slot = equipment.type;
  const existing = h.equipment[slot];
  h.equipment[slot] = equipment;
  let replaced: IEquipment | null = null;
  let inventoryFull = false;
  if (existing) {
    if (h.inventory.length >= INVENTORY_LIMIT) {
      inventoryFull = true;
    } else {
      h.inventory.push(existing);
    }
    replaced = existing;
  }
  return { hero: h, replaced, inventoryFull };
}

export function unequipItem(
  hero: any,
  slot: EquipmentType
): { hero: any; success: boolean; inventoryFull: boolean } {
  const h: any = JSON.parse(JSON.stringify(hero));
  const eq = h.equipment[slot];
  if (!eq) return { hero: h, success: false, inventoryFull: false };
  if (h.inventory.length >= INVENTORY_LIMIT) {
    return { hero: h, success: false, inventoryFull: true };
  }
  h.inventory.push(eq);
  h.equipment[slot] = null;
  return { hero: h, success: true, inventoryFull: false };
}

export function addToInventory(hero: any, equipment: IEquipment): { hero: any; added: boolean } {
  const h: any = JSON.parse(JSON.stringify(hero));
  if (h.inventory.length >= INVENTORY_LIMIT) {
    return { hero: h, added: false };
  }
  h.inventory.push(equipment);
  return { hero: h, added: true };
}

export function removeFromInventory(hero: any, eqId: string): any {
  const h: any = JSON.parse(JSON.stringify(hero));
  h.inventory = h.inventory.filter((e: IEquipment) => e.id !== eqId);
  return h;
}

export function formatBonus(bonus: IEquipment['bonus']): string[] {
  const map: Record<string, string> = {
    atk: '攻击',
    def: '防御',
    spd: '速度',
    hp: '生命',
    matk: '魔攻',
  };
  const parts: string[] = [];
  Object.entries(bonus).forEach(([k, v]) => {
    if (v) parts.push(`${map[k] || k}+${v}`);
  });
  return parts;
}
