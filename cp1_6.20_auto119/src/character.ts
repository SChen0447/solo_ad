export enum CharacterClass {
  WARRIOR = 'warrior',
  MAGE = 'mage',
  ROGUE = 'rogue',
  PRIEST = 'priest',
  HUNTER = 'hunter'
}

export enum Rarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum EquipmentSlot {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory'
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  damage: number;
  manaCost: number;
  cooldown: number;
  currentCooldown: number;
  type: 'attack' | 'heal' | 'buff' | 'debuff';
  target: 'single' | 'all' | 'self';
  animationType: string;
}

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  stats: {
    attack?: number;
    defense?: number;
    hp?: number;
    critRate?: number;
  };
  icon: string;
}

export interface Item {
  id: string;
  name: string;
  type: 'equipment' | 'consumable' | 'material';
  rarity: Rarity;
  quantity: number;
  icon: string;
  equipment?: Equipment;
}

export const RARITY_COLORS: Record<Rarity, string> = {
  [Rarity.COMMON]: '#ffffff',
  [Rarity.RARE]: '#3498db',
  [Rarity.EPIC]: '#9b59b6',
  [Rarity.LEGENDARY]: '#e67e22'
};

export const CLASS_COLORS: Record<CharacterClass, string> = {
  [CharacterClass.WARRIOR]: '#e63946',
  [CharacterClass.MAGE]: '#457b9d',
  [CharacterClass.ROGUE]: '#2a9d8f',
  [CharacterClass.PRIEST]: '#f4a261',
  [CharacterClass.HUNTER]: '#e9c46a'
};

export const CLASS_NAMES: Record<CharacterClass, string> = {
  [CharacterClass.WARRIOR]: '战士',
  [CharacterClass.MAGE]: '法师',
  [CharacterClass.ROGUE]: '盗贼',
  [CharacterClass.PRIEST]: '牧师',
  [CharacterClass.HUNTER]: '猎人'
};

export const CLASS_INITIALS: Record<CharacterClass, string> = {
  [CharacterClass.WARRIOR]: '战',
  [CharacterClass.MAGE]: '法',
  [CharacterClass.ROGUE]: '盗',
  [CharacterClass.PRIEST]: '牧',
  [CharacterClass.HUNTER]: '猎'
};

export class Character {
  public id: string;
  public name: string;
  public class: CharacterClass;
  public level: number;
  
  public maxHp!: number;
  public currentHp!: number;
  public maxMp!: number;
  public currentMp!: number;
  public attack!: number;
  public defense!: number;
  public critRate!: number;
  
  public skills: Skill[];
  public equipment: Record<EquipmentSlot, Equipment | null>;
  public isAlive: boolean;
  public isSelected: boolean;
  
  public position: { x: number; y: number };
  public targetPosition: { x: number; y: number } | null;
  public moveProgress: number;

  constructor(charClass: CharacterClass, name?: string) {
    this.id = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.class = charClass;
    this.name = name || CLASS_NAMES[charClass];
    this.level = 1;
    this.isAlive = true;
    this.isSelected = false;
    this.position = { x: 0, y: 0 };
    this.targetPosition = null;
    this.moveProgress = 0;
    
    this.equipment = {
      [EquipmentSlot.WEAPON]: null,
      [EquipmentSlot.ARMOR]: null,
      [EquipmentSlot.ACCESSORY]: null
    };
    
    this.initializeStats();
    this.skills = this.initializeSkills();
  }

  private initializeStats(): void {
    const baseStats: Record<CharacterClass, { hp: number; mp: number; atk: number; def: number; crit: number }> = {
      [CharacterClass.WARRIOR]: { hp: 150, mp: 30, atk: 25, def: 15, crit: 0.1 },
      [CharacterClass.MAGE]: { hp: 80, mp: 100, atk: 35, def: 5, crit: 0.15 },
      [CharacterClass.ROGUE]: { hp: 100, mp: 50, atk: 30, def: 8, crit: 0.25 },
      [CharacterClass.PRIEST]: { hp: 90, mp: 80, atk: 15, def: 10, crit: 0.05 },
      [CharacterClass.HUNTER]: { hp: 110, mp: 60, atk: 28, def: 10, crit: 0.2 }
    };

    const stats = baseStats[this.class];
    this.maxHp = stats.hp;
    this.currentHp = stats.hp;
    this.maxMp = stats.mp;
    this.currentMp = stats.mp;
    this.attack = stats.atk;
    this.defense = stats.def;
    this.critRate = stats.crit;
  }

  private initializeSkills(): Skill[] {
    const classSkills: Record<CharacterClass, Skill[]> = {
      [CharacterClass.WARRIOR]: [
        {
          id: 'slash',
          name: '斩击',
          description: '对单个敌人造成物理伤害',
          damage: 1.0,
          manaCost: 0,
          cooldown: 0,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'slash'
        },
        {
          id: 'whirlwind',
          name: '旋风斩',
          description: '对所有敌人造成物理伤害',
          damage: 0.7,
          manaCost: 15,
          cooldown: 2,
          currentCooldown: 0,
          type: 'attack',
          target: 'all',
          animationType: 'whirlwind'
        },
        {
          id: 'shield_bash',
          name: '盾击',
          description: '造成伤害并降低敌人防御',
          damage: 0.8,
          manaCost: 10,
          cooldown: 1,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'shield'
        }
      ],
      [CharacterClass.MAGE]: [
        {
          id: 'fireball',
          name: '火球术',
          description: '发射火球攻击单个敌人',
          damage: 1.2,
          manaCost: 10,
          cooldown: 0,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'fireball'
        },
        {
          id: 'meteor',
          name: '陨石术',
          description: '召唤陨石攻击所有敌人',
          damage: 0.9,
          manaCost: 30,
          cooldown: 3,
          currentCooldown: 0,
          type: 'attack',
          target: 'all',
          animationType: 'meteor'
        },
        {
          id: 'frost_nova',
          name: '冰霜新星',
          description: '冰冻所有敌人并造成伤害',
          damage: 0.6,
          manaCost: 20,
          cooldown: 2,
          currentCooldown: 0,
          type: 'attack',
          target: 'all',
          animationType: 'frost'
        }
      ],
      [CharacterClass.ROGUE]: [
        {
          id: 'backstab',
          name: '背刺',
          description: '从背后攻击造成高额伤害',
          damage: 1.5,
          manaCost: 5,
          cooldown: 0,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'backstab'
        },
        {
          id: 'poison_blade',
          name: '毒刃',
          description: '附带毒素持续伤害',
          damage: 1.0,
          manaCost: 10,
          cooldown: 1,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'poison'
        },
        {
          id: 'shadow_strike',
          name: '暗影突袭',
          description: '瞬间移动并攻击所有敌人',
          damage: 0.8,
          manaCost: 25,
          cooldown: 3,
          currentCooldown: 0,
          type: 'attack',
          target: 'all',
          animationType: 'shadow'
        }
      ],
      [CharacterClass.PRIEST]: [
        {
          id: 'smite',
          name: '神圣打击',
          description: '用神圣力量攻击敌人',
          damage: 0.9,
          manaCost: 5,
          cooldown: 0,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'holy'
        },
        {
          id: 'heal',
          name: '治愈术',
          description: '恢复单个友方生命值',
          damage: -1.2,
          manaCost: 15,
          cooldown: 1,
          currentCooldown: 0,
          type: 'heal',
          target: 'single',
          animationType: 'heal'
        },
        {
          id: 'holy_light',
          name: '神圣之光',
          description: '治愈所有友方单位',
          damage: -0.8,
          manaCost: 30,
          cooldown: 3,
          currentCooldown: 0,
          type: 'heal',
          target: 'all',
          animationType: 'holylight'
        }
      ],
      [CharacterClass.HUNTER]: [
        {
          id: 'arrow_shot',
          name: '箭术射击',
          description: '远程射击单个敌人',
          damage: 1.1,
          manaCost: 0,
          cooldown: 0,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'arrow'
        },
        {
          id: 'multi_shot',
          name: '多重射击',
          description: '同时射击多个敌人',
          damage: 0.7,
          manaCost: 15,
          cooldown: 2,
          currentCooldown: 0,
          type: 'attack',
          target: 'all',
          animationType: 'multishot'
        },
        {
          id: 'beast_call',
          name: '野兽呼唤',
          description: '召唤野兽攻击敌人',
          damage: 1.3,
          manaCost: 20,
          cooldown: 3,
          currentCooldown: 0,
          type: 'attack',
          target: 'single',
          animationType: 'beast'
        }
      ]
    };

    return classSkills[this.class].map(skill => ({ ...skill }));
  }

  public takeDamage(damage: number): number {
    const actualDamage = Math.max(1, damage - this.defense);
    this.currentHp = Math.max(0, this.currentHp - actualDamage);
    if (this.currentHp <= 0) {
      this.isAlive = false;
    }
    return actualDamage;
  }

  public heal(amount: number): number {
    const actualHeal = Math.min(amount, this.maxHp - this.currentHp);
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
    return actualHeal;
  }

  public useMana(amount: number): boolean {
    if (this.currentMp >= amount) {
      this.currentMp -= amount;
      return true;
    }
    return false;
  }

  public restoreMana(amount: number): void {
    this.currentMp = Math.min(this.maxMp, this.currentMp + amount);
  }

  public equipItem(item: Equipment): Equipment | null {
    const slot = item.slot;
    const oldItem = this.equipment[slot];
    this.equipment[slot] = item;
    this.recalculateStats();
    return oldItem;
  }

  public unequipItem(slot: EquipmentSlot): Equipment | null {
    const item = this.equipment[slot];
    this.equipment[slot] = null;
    this.recalculateStats();
    return item;
  }

  private recalculateStats(): void {
    this.initializeStats();
    
    for (const slot of Object.values(EquipmentSlot)) {
      const item = this.equipment[slot];
      if (item) {
        if (item.stats.attack) this.attack += item.stats.attack;
        if (item.stats.defense) this.defense += item.stats.defense;
        if (item.stats.hp) {
          this.maxHp += item.stats.hp;
          this.currentHp += item.stats.hp;
        }
        if (item.stats.critRate) this.critRate += item.stats.critRate;
      }
    }
  }

  public getHpPercentage(): number {
    return this.currentHp / this.maxHp;
  }

  public getMpPercentage(): number {
    return this.currentMp / this.maxMp;
  }

  public reduceCooldowns(): void {
    for (const skill of this.skills) {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    }
  }

  public canUseSkill(skillId: string): boolean {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return false;
    return skill.currentCooldown <= 0 && this.currentMp >= skill.manaCost;
  }
}

export class Inventory {
  public items: Item[];
  public maxSlots: number;

  constructor(maxSlots: number = 12) {
    this.maxSlots = maxSlots;
    this.items = [];
  }

  public addItem(item: Item): boolean {
    if (this.items.length >= this.maxSlots) {
      return false;
    }

    const existingItem = this.items.find(i => i.id === item.id && i.type === 'consumable');
    if (existingItem && item.type === 'consumable') {
      existingItem.quantity += item.quantity;
      return true;
    }

    this.items.push({ ...item });
    return true;
  }

  public removeItem(itemId: string, quantity: number = 1): boolean {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index === -1) return false;

    const item = this.items[index];
    if (item.quantity > quantity) {
      item.quantity -= quantity;
    } else {
      this.items.splice(index, 1);
    }
    return true;
  }

  public getItem(itemId: string): Item | undefined {
    return this.items.find(i => i.id === itemId);
  }

  public getEmptySlots(): number {
    return this.maxSlots - this.items.length;
  }

  public isFull(): boolean {
    return this.items.length >= this.maxSlots;
  }
}

export function createRandomEquipment(slot: EquipmentSlot, minRarity: Rarity = Rarity.COMMON): Equipment {
  const rarityOrder = [Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY];
  const minIndex = rarityOrder.indexOf(minRarity);
  
  const rand = Math.random();
  let rarity: Rarity;
  if (rand < 0.5) rarity = Rarity.COMMON;
  else if (rand < 0.8) rarity = Rarity.RARE;
  else if (rand < 0.95) rarity = Rarity.EPIC;
  else rarity = Rarity.LEGENDARY;

  if (rarityOrder.indexOf(rarity) < minIndex) {
    rarity = minRarity;
  }

  const rarityMultiplier = {
    [Rarity.COMMON]: 1,
    [Rarity.RARE]: 1.5,
    [Rarity.EPIC]: 2,
    [Rarity.LEGENDARY]: 3
  };

  const baseStats: Record<EquipmentSlot, Partial<{ attack: number; defense: number; hp: number; critRate: number }>> = {
    [EquipmentSlot.WEAPON]: { attack: 5 },
    [EquipmentSlot.ARMOR]: { defense: 5, hp: 10 },
    [EquipmentSlot.ACCESSORY]: { critRate: 0.02, attack: 2 }
  };

  const slotNames = {
    [EquipmentSlot.WEAPON]: ['铁剑', '钢剑', '秘银剑', '龙牙剑', '暗影之刃', '圣光之剑'],
    [EquipmentSlot.ARMOR]: ['皮甲', '锁子甲', '板甲', '龙鳞甲', '暗影护甲', '神圣铠甲'],
    [EquipmentSlot.ACCESSORY]: ['力量戒指', '敏捷护符', '智慧项链', '生命宝石', '暴击指环', '全能吊坠']
  };

  const names = slotNames[slot];
  const name = names[Math.floor(Math.random() * names.length)];
  const mult = rarityMultiplier[rarity];
  const base = baseStats[slot];

  const stats: Equipment['stats'] = {};
  if (base.attack) stats.attack = Math.floor(base.attack * mult * (0.8 + Math.random() * 0.4));
  if (base.defense) stats.defense = Math.floor(base.defense * mult * (0.8 + Math.random() * 0.4));
  if (base.hp) stats.hp = Math.floor(base.hp * mult * (0.8 + Math.random() * 0.4));
  if (base.critRate) stats.critRate = base.critRate * mult * (0.8 + Math.random() * 0.4);

  const id = `equip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const rarityPrefixes = {
    [Rarity.COMMON]: '',
    [Rarity.RARE]: '精良的 ',
    [Rarity.EPIC]: '史诗的 ',
    [Rarity.LEGENDARY]: '传说的 '
  };

  return {
    id,
    name: rarityPrefixes[rarity] + name,
    slot,
    rarity,
    stats,
    icon: slot
  };
}
