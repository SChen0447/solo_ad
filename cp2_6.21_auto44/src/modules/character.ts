export type HeroClass = 'warrior' | 'mage' | 'rogue' | 'archer';

export type AttributeType = 'str' | 'agi' | 'vit' | 'int';

export interface IHero {
  name: string;
  heroClass: HeroClass;
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  matk: number;
  availablePoints: number;
  str: number;
  agi: number;
  vit: number;
  int: number;
  equipment: Record<string, any | null>;
  inventory: any[];
  potions: number;
  pendingAttrs: { str: number; agi: number; vit: number; int: number };
}

export const CLASS_STATS: Record<HeroClass, { hp: number; atk: number; def: number; spd: number; matk: number; name: string }> = {
  warrior: { hp: 150, atk: 15, def: 12, spd: 8, matk: 3, name: '战士' },
  mage: { hp: 100, atk: 18, def: 6, spd: 10, matk: 15, name: '法师' },
  rogue: { hp: 110, atk: 12, def: 8, spd: 18, matk: 5, name: '盗贼' },
  archer: { hp: 120, atk: 16, def: 10, spd: 14, matk: 6, name: '弓箭手' },
};

export const ATTR_COEFFICIENTS: Record<AttributeType, { label: string; apply: (hero: IHero, points: number) => void }> = {
  str: {
    label: '力量',
    apply: (hero, points) => { hero.atk += points * 2; },
  },
  agi: {
    label: '敏捷',
    apply: (hero, points) => { hero.spd += points * 1; },
  },
  vit: {
    label: '耐力',
    apply: (hero, points) => {
      hero.maxHp += points * 10;
      hero.hp = Math.min(hero.hp + points * 10, hero.maxHp);
      hero.def += points * 1;
    },
  },
  int: {
    label: '智力',
    apply: (hero, points) => { hero.matk += points * 3; },
  },
};

export function calcExpToNext(level: number): number {
  return Math.floor(50 * Math.pow(1.5, level - 1));
}

export function createHero(name: string, heroClass: HeroClass): IHero {
  const stats = CLASS_STATS[heroClass];
  return {
    name: name.slice(0, 16),
    heroClass,
    level: 1,
    exp: 0,
    expToNext: calcExpToNext(1),
    hp: stats.hp,
    maxHp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    matk: stats.matk,
    availablePoints: 0,
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    equipment: { weapon: null, helmet: null, armor: null, boots: null },
    inventory: [],
    potions: 3,
    pendingAttrs: { str: 0, agi: 0, vit: 0, int: 0 },
  };
}

export function recalcStatsFromAttrs(hero: IHero): IHero {
  const h: IHero = JSON.parse(JSON.stringify(hero));
  const base = CLASS_STATS[h.heroClass];
  h.maxHp = base.hp;
  h.atk = base.atk;
  h.def = base.def;
  h.spd = base.spd;
  h.matk = base.matk;
  const levelBonus = (h.level - 1);
  h.maxHp += levelBonus * 12;
  h.atk += levelBonus * 2;
  h.def += levelBonus * 1;
  h.spd += levelBonus * 1;
  h.matk += levelBonus * 1;
  const totalStr = h.str + h.pendingAttrs.str;
  const totalAgi = h.agi + h.pendingAttrs.agi;
  const totalVit = h.vit + h.pendingAttrs.vit;
  const totalInt = h.int + h.pendingAttrs.int;
  h.atk += totalStr * 2;
  h.spd += totalAgi * 1;
  h.maxHp += totalVit * 10;
  h.def += totalVit * 1;
  h.matk += totalInt * 3;
  Object.values(h.equipment).forEach((eq: any) => {
    if (eq && eq.bonus) {
      if (eq.bonus.atk) h.atk += eq.bonus.atk;
      if (eq.bonus.def) h.def += eq.bonus.def;
      if (eq.bonus.spd) h.spd += eq.bonus.spd;
      if (eq.bonus.hp) h.maxHp += eq.bonus.hp;
      if (eq.bonus.matk) h.matk += eq.bonus.matk;
    }
  });
  h.hp = Math.min(h.hp, h.maxHp);
  return h;
}

export function assignPendingAttr(hero: IHero, attr: AttributeType): { hero: IHero; success: boolean } {
  if (hero.availablePoints <= 0) return { hero, success: false };
  const h: IHero = JSON.parse(JSON.stringify(hero));
  h.availablePoints -= 1;
  h.pendingAttrs[attr] += 1;
  return { hero: h, success: true };
}

export function confirmAttrs(hero: IHero): IHero {
  const h: IHero = JSON.parse(JSON.stringify(hero));
  h.str += h.pendingAttrs.str;
  h.agi += h.pendingAttrs.agi;
  h.vit += h.pendingAttrs.vit;
  h.int += h.pendingAttrs.int;
  h.pendingAttrs = { str: 0, agi: 0, vit: 0, int: 0 };
  return recalcStatsFromAttrs(h);
}

export function levelUp(hero: IHero): IHero {
  let h: IHero = JSON.parse(JSON.stringify(hero));
  h.level += 1;
  h.availablePoints += 5;
  h.expToNext = calcExpToNext(h.level);
  h = recalcStatsFromAttrs(h);
  h.hp = h.maxHp;
  return h;
}

export function gainExp(hero: IHero, amount: number): { hero: IHero; leveledUp: number } {
  let h: IHero = JSON.parse(JSON.stringify(hero));
  h.exp += amount;
  let leveledUp = 0;
  while (h.exp >= h.expToNext) {
    h.exp -= h.expToNext;
    h = levelUp(h);
    leveledUp += 1;
  }
  return { hero: h, leveledUp };
}

export function healHero(hero: IHero, amount: number): IHero {
  const h: IHero = JSON.parse(JSON.stringify(hero));
  h.hp = Math.min(h.hp + amount, h.maxHp);
  return h;
}

export function restHero(hero: IHero): IHero {
  const h: IHero = JSON.parse(JSON.stringify(hero));
  h.hp = h.maxHp;
  h.potions = Math.min(h.potions + 2, 5);
  return h;
}
