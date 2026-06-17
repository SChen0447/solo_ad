export interface AffixData {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  particleColor: string;
  hpMod: number;
  atkMod: number;
  defMod: number;
  attackType: 'physical' | 'magical';
  materials: MaterialData[];
}

export interface MaterialData {
  id: string;
  name: string;
}

export interface MonsterData {
  id: string;
  name: string;
  affixes: AffixData[];
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackType: string;
  color: string;
  particleColor: string;
  drops: MaterialData[];
}

export interface RecipeData {
  id: string;
  name: string;
  materials: string[];
  attack: number;
  defense: number;
  critRate: number;
  effect: string;
  iconColor: string;
}

export interface WeaponData {
  id: string;
  recipeId: string;
  name: string;
  attack: number;
  defense: number;
  critRate: number;
  effect: string;
  iconColor: string;
  forgedAt: string;
}

export interface CollectionData {
  monsters: MonsterCollectionEntry[];
  weapons: WeaponCollectionEntry[];
}

export interface MonsterCollectionEntry {
  id: string;
  name: string;
  affixes: string[];
  hp: number;
  attack: number;
  defense: number;
  drops: MaterialData[];
  defeatedAt: string;
}

export interface WeaponCollectionEntry {
  recipeId: string;
  name: string;
  attack: number;
  defense: number;
  critRate: number;
  effect: string;
  iconColor: string;
  firstForgedAt: string;
}

export interface UnlockData {
  monsterCount: number;
  weaponCount: number;
  unlockedAffixes: string[];
  forgeSlots: number;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  materials: MaterialData[];
  weapons: WeaponData[];
  equippedWeapon: WeaponData | null;
  steps: number;
}

export interface BestiaryResponse {
  affixes: AffixData[];
}

export interface RecipesResponse {
  recipes: RecipeData[];
}

export interface MatchResponse {
  matched: boolean;
  weapon?: WeaponData;
}

export type SkillEffectType = 'damage' | 'heal' | 'armorBreak' | 'stun' | 'burn' | 'shield';

export interface SkillData {
  id: string;
  name: string;
  description: string;
  effectType: SkillEffectType;
  damageMultiplier: number;
  healPercent: number;
  armorBreakPercent: number;
  stunDuration: number;
  burnDamage: number;
  burnDuration: number;
  shieldAmount: number;
  cooldown: number;
  iconColor: string;
  iconSymbol: string;
}

export interface SkillState {
  skill: SkillData;
  currentCooldown: number;
}
