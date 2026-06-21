export type HeroClass = 'warrior' | 'mage' | 'rogue' | 'archer';

export type AttributeType = 'str' | 'agi' | 'vit' | 'int';

export type SkillType = 'attack' | 'heal' | 'buff';

export interface ISkill {
  id: string;
  name: string;
  type: SkillType;
  power: number;
  mpCost: number;
  description: string;
  fromEquipment?: boolean;
}

export interface IHero {
  name: string;
  heroClass: HeroClass;
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  matk: number;
  availablePoints: number;
  str: number;
  agi: number;
  vit: number;
  int: number;
  skills: ISkill[];
  equipment: Record<string, any | null>;
  inventory: any[];
  potions: number;
  pendingAttrs: { str: number; agi: number; vit: number; int: number };
}

export const CLASS_STATS: Record<HeroClass, { hp: number; mp: number; atk: number; def: number; spd: number; matk: number; name: string }> = {
  warrior: { hp: 150, mp: 30, atk: 15, def: 12, spd: 8, matk: 3, name: '战士' },
  mage: { hp: 100, mp: 80, atk: 18, def: 6, spd: 10, matk: 15, name: '法师' },
  rogue: { hp: 110, mp: 50, atk: 12, def: 8, spd: 18, matk: 5, name: '盗贼' },
  archer: { hp: 120, mp: 45, atk: 16, def: 10, spd: 14, matk: 6, name: '弓箭手' },
};

const DEFAULT_SKILLS: Record<HeroClass, ISkill[]> = {
  warrior: [
    { id: 'power_strike', name: '强力一击', type: 'attack', power: 1.8, mpCost: 8, description: '蓄力攻击，造成1.8倍攻击力伤害' },
    { id: 'first_aid', name: '初级治疗', type: 'heal', power: 30, mpCost: 10, description: '消耗10MP，恢复30点HP' },
  ],
  mage: [
    { id: 'fireball', name: '火球术', type: 'attack', power: 2.2, mpCost: 12, description: '释放火球，造成2.2倍魔法攻击伤害' },
    { id: 'heal', name: '治愈术', type: 'heal', power: 50, mpCost: 15, description: '消耗15MP，恢复50点HP' },
  ],
  rogue: [
    { id: 'backstab', name: '背刺', type: 'attack', power: 2.0, mpCost: 10, description: '偷袭攻击，造成2.0倍攻击力伤害' },
    { id: 'potion_throw', name: '投掷药水', type: 'heal', power: 35, mpCost: 12, description: '消耗12MP，恢复35点HP' },
  ],
  archer: [
    { id: 'arrow_rain', name: '箭雨', type: 'attack', power: 1.9, mpCost: 10, description: '连续射击，造成1.9倍攻击力伤害' },
    { id: 'herbal_heal', name: '草药治疗', type: 'heal', power: 40, mpCost: 12, description: '消耗12MP，恢复40点HP' },
  ],
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
    mp: stats.mp,
    maxMp: stats.mp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    matk: stats.matk,
    availablePoints: 0,
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    skills: JSON.parse(JSON.stringify(DEFAULT_SKILLS[heroClass])),
    equipment: { weapon: null, helmet: null, armor: null, boots: null },
    inventory: [],
    potions: 3,
    pendingAttrs: { str: 0, agi: 0, vit: 0, int: 0 },
  };
}

function mergeSkills(baseSkills: ISkill[], equipSkills: ISkill[]): ISkill[] {
  const seen = new Set(baseSkills.map(s => s.id));
  const result = [...baseSkills];
  equipSkills.forEach(s => {
    if (!seen.has(s.id)) {
      result.push(s);
      seen.add(s.id);
    }
  });
  return result;
}

export function recalcStatsFromAttrs(hero: IHero): IHero {
  const h: IHero = JSON.parse(JSON.stringify(hero));
  const base = CLASS_STATS[h.heroClass];
  h.maxHp = base.hp;
  h.maxMp = base.mp;
  h.atk = base.atk;
  h.def = base.def;
  h.spd = base.spd;
  h.matk = base.matk;
  const levelBonus = (h.level - 1);
  h.maxHp += levelBonus * 12;
  h.maxMp += levelBonus * 5;
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
  h.maxMp += totalInt * 5;
  h.matk += totalInt * 3;
  const equipSkills: ISkill[] = [];
  Object.values(h.equipment).forEach((eq: any) => {
    if (eq && eq.bonus) {
      if (eq.bonus.atk) h.atk += eq.bonus.atk;
      if (eq.bonus.def) h.def += eq.bonus.def;
      if (eq.bonus.spd) h.spd += eq.bonus.spd;
      if (eq.bonus.hp) h.maxHp += eq.bonus.hp;
      if (eq.bonus.matk) h.matk += eq.bonus.matk;
      if (eq.bonus.mp) h.maxMp += eq.bonus.mp;
      if (eq.skills && Array.isArray(eq.skills)) {
        eq.skills.forEach((s: ISkill) => equipSkills.push({ ...s, fromEquipment: true }));
      }
    }
  });
  h.skills = mergeSkills(
    JSON.parse(JSON.stringify(DEFAULT_SKILLS[h.heroClass])),
    equipSkills
  );
  h.hp = Math.min(h.hp, h.maxHp);
  h.mp = Math.min(h.mp, h.maxMp);
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
  h.mp = h.maxMp;
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
  h.mp = h.maxMp;
  h.potions = Math.min(h.potions + 2, 5);
  return h;
}
