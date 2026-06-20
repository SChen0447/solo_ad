export interface Spell {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  cooldown: number;
  damage: number;
  effect: SpellEffect;
  icon: string;
  requiredLevel: number;
}

export type SpellEffect = 'damage' | 'heal' | 'slow' | 'shield' | 'burn' | 'freeze' | 'aoe' | 'buff';

export interface LearnedSpell {
  spellId: string;
  cooldownRemaining: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  count: number;
  type: 'consumable' | 'material' | 'quest';
  description: string;
}

export interface PlayerStats {
  level: number;
  exp: number;
  expToNext: number;
  mana: number;
  maxMana: number;
  hp: number;
  maxHp: number;
  knowledge: number;
  alchemyLevel: number;
  combatLevel: number;
  skillPoints: number;
}

export interface PlayerData {
  stats: PlayerStats;
  currentSceneId: string;
  learnedSpells: LearnedSpell[];
  inventory: InventoryItem[];
  unlockedScenes: string[];
  completedQuests: string[];
}

const EXP_PER_LEVEL = 100;

export const SPELLS: Record<string, Spell> = {
  fireball: {
    id: 'fireball',
    name: '火球术',
    description: '发射一颗炽热的火球，造成大量伤害',
    manaCost: 15,
    cooldown: 5,
    damage: 35,
    effect: 'damage',
    icon: '🔥',
    requiredLevel: 1
  },
  heal: {
    id: 'heal',
    name: '治愈术',
    description: '恢复自身生命值',
    manaCost: 20,
    cooldown: 8,
    damage: 40,
    effect: 'heal',
    icon: '💚',
    requiredLevel: 2
  },
  slowTime: {
    id: 'slowTime',
    name: '时间减缓',
    description: '减缓敌人行动，降低其攻击力',
    manaCost: 25,
    cooldown: 15,
    damage: 0,
    effect: 'slow',
    icon: '⏳',
    requiredLevel: 3
  },
  iceSpear: {
    id: 'iceSpear',
    name: '冰锥术',
    description: '召唤锋利的冰锥，可冻结敌人',
    manaCost: 18,
    cooldown: 6,
    damage: 28,
    effect: 'freeze',
    icon: '❄️',
    requiredLevel: 2
  },
  poisonCloud: {
    id: 'poisonCloud',
    name: '毒雾术',
    description: '释放毒雾，持续造成伤害',
    manaCost: 22,
    cooldown: 10,
    damage: 20,
    effect: 'burn',
    icon: '☠️',
    requiredLevel: 4
  },
  magicShield: {
    id: 'magicShield',
    name: '魔法护盾',
    description: '召唤护盾，吸收下次伤害',
    manaCost: 30,
    cooldown: 12,
    damage: 50,
    effect: 'shield',
    icon: '🛡️',
    requiredLevel: 3
  },
  lightning: {
    id: 'lightning',
    name: '闪电链',
    description: '召唤闪电链攻击，范围伤害',
    manaCost: 35,
    cooldown: 10,
    damage: 45,
    effect: 'aoe',
    icon: '⚡',
    requiredLevel: 5
  },
  powerUp: {
    id: 'powerUp',
    name: '力量增幅',
    description: '增强下次攻击的伤害',
    manaCost: 15,
    cooldown: 8,
    damage: 0,
    effect: 'buff',
    icon: '💪',
    requiredLevel: 2
  }
};

export class Player {
  data: PlayerData;

  constructor() {
    this.data = this.createNewPlayer();
  }

  createNewPlayer(): PlayerData {
    return {
      stats: {
        level: 1,
        exp: 0,
        expToNext: EXP_PER_LEVEL,
        mana: 50,
        maxMana: 50,
        hp: 100,
        maxHp: 100,
        knowledge: 0,
        alchemyLevel: 1,
        combatLevel: 1,
        skillPoints: 0
      },
      currentSceneId: 'hall',
      learnedSpells: [],
      inventory: [],
      unlockedScenes: ['hall', 'library', 'alchemy', 'classroom', 'dormitory'],
      completedQuests: []
    };
  }

  addExp(amount: number): boolean {
    this.data.stats.exp += amount;
    let leveledUp = false;
    while (this.data.stats.exp >= this.data.stats.expToNext) {
      this.data.stats.exp -= this.data.stats.expToNext;
      this.data.stats.level++;
      this.data.stats.skillPoints += 3;
      this.data.stats.maxMana += 10;
      this.data.stats.mana = this.data.stats.maxMana;
      this.data.stats.maxHp += 20;
      this.data.stats.hp = this.data.stats.maxHp;
      this.data.stats.expToNext = Math.floor(EXP_PER_LEVEL * Math.pow(1.2, this.data.stats.level - 1));
      leveledUp = true;
    }
    return leveledUp;
  }

  useMana(amount: number): boolean {
    if (this.data.stats.mana >= amount) {
      this.data.stats.mana -= amount;
      return true;
    }
    return false;
  }

  restoreMana(amount: number) {
    this.data.stats.mana = Math.min(this.data.stats.maxMana, this.data.stats.mana + amount);
  }

  takeDamage(amount: number): boolean {
    this.data.stats.hp = Math.max(0, this.data.stats.hp - amount);
    return this.data.stats.hp <= 0;
  }

  heal(amount: number) {
    this.data.stats.hp = Math.min(this.data.stats.maxHp, this.data.stats.hp + amount);
  }

  learnSpell(spellId: string): boolean {
    const spell = SPELLS[spellId];
    if (!spell) return false;
    if (this.data.stats.level < spell.requiredLevel) return false;
    if (this.data.learnedSpells.find(s => s.spellId === spellId)) return false;
    if (this.data.stats.skillPoints < 1) return false;

    this.data.stats.skillPoints--;
    this.data.learnedSpells.push({ spellId, cooldownRemaining: 0 });
    return true;
  }

  canUseSpell(spellId: string): boolean {
    const learned = this.data.learnedSpells.find(s => s.spellId === spellId);
    if (!learned) return false;
    const spell = SPELLS[spellId];
    if (!spell) return false;
    return learned.cooldownRemaining <= 0 && this.data.stats.mana >= spell.manaCost;
  }

  useSpell(spellId: string): Spell | null {
    if (!this.canUseSpell(spellId)) return null;
    const learned = this.data.learnedSpells.find(s => s.spellId === spellId)!;
    const spell = SPELLS[spellId];
    if (!this.useMana(spell.manaCost)) return null;
    learned.cooldownRemaining = spell.cooldown;
    return spell;
  }

  updateCooldowns(dt: number) {
    for (const learned of this.data.learnedSpells) {
      if (learned.cooldownRemaining > 0) {
        learned.cooldownRemaining = Math.max(0, learned.cooldownRemaining - dt);
      }
    }
  }

  addItem(itemId: string, name: string, type: InventoryItem['type'], description: string, count: number = 1) {
    const existing = this.data.inventory.find(i => i.id === itemId);
    if (existing) {
      existing.count += count;
    } else {
      this.data.inventory.push({ id: itemId, name, type, description, count });
    }
  }

  removeItem(itemId: string, count: number = 1): boolean {
    const existing = this.data.inventory.find(i => i.id === itemId);
    if (!existing || existing.count < count) return false;
    existing.count -= count;
    if (existing.count <= 0) {
      this.data.inventory = this.data.inventory.filter(i => i.id !== itemId);
    }
    return true;
  }

  hasItem(itemId: string): boolean {
    return this.data.inventory.some(i => i.id === itemId && i.count > 0);
  }

  setScene(sceneId: string) {
    this.data.currentSceneId = sceneId;
    if (!this.data.unlockedScenes.includes(sceneId)) {
      this.data.unlockedScenes.push(sceneId);
    }
  }

  unlockScene(sceneId: string) {
    if (!this.data.unlockedScenes.includes(sceneId)) {
      this.data.unlockedScenes.push(sceneId);
    }
  }

  serialize(): PlayerData {
    return JSON.parse(JSON.stringify(this.data));
  }

  deserialize(data: PlayerData) {
    this.data = JSON.parse(JSON.stringify(data));
  }
}
