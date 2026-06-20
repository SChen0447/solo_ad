import axios from 'axios';
import { RuneType } from '@/types';
import type { MagicItem, CombinationRule, CraftResponse, UpgradeResponse, InventoryResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const staticRules: CombinationRule[] = [
  { runes: [RuneType.FIRE, RuneType.FIRE, RuneType.FIRE], itemName: '烈焰之杖', shape: { type: 'staff', parts: ['sphere', 'torus'] }, power: 30, rarity: 'rare' },
  { runes: [RuneType.WATER, RuneType.WATER, RuneType.WATER], itemName: '海潮之剑', shape: { type: 'sword', parts: ['cube', 'cone'] }, power: 30, rarity: 'rare' },
  { runes: [RuneType.EARTH, RuneType.EARTH, RuneType.EARTH], itemName: '大地之盾', shape: { type: 'shield', parts: ['cylinder', 'torus'] }, power: 35, rarity: 'rare' },
  { runes: [RuneType.WIND, RuneType.WIND, RuneType.WIND], itemName: '疾风之戒', shape: { type: 'ring', parts: ['torus', 'sphere'] }, power: 25, rarity: 'rare' },
  { runes: [RuneType.LIGHT, RuneType.LIGHT, RuneType.LIGHT], itemName: '圣光护符', shape: { type: 'amulet', parts: ['octahedron', 'torus'] }, power: 35, rarity: 'epic' },
  { runes: [RuneType.DARK, RuneType.DARK, RuneType.DARK], itemName: '暗影水晶', shape: { type: 'crystal', parts: ['octahedron', 'icosahedron'] }, power: 35, rarity: 'epic' },
  { runes: [RuneType.FIRE, RuneType.WATER, RuneType.EARTH], itemName: '元素法杖', shape: { type: 'staff', parts: ['sphere', 'cylinder', 'torus'] }, power: 45, rarity: 'epic' },
  { runes: [RuneType.FIRE, RuneType.WIND, RuneType.LIGHT], itemName: '炎阳之剑', shape: { type: 'sword', parts: ['cone', 'cube', 'sphere'] }, power: 50, rarity: 'epic' },
  { runes: [RuneType.WATER, RuneType.EARTH, RuneType.DARK], itemName: '深渊之盾', shape: { type: 'shield', parts: ['cylinder', 'torus', 'sphere'] }, power: 55, rarity: 'epic' },
  { runes: [RuneType.FIRE, RuneType.FIRE, RuneType.LIGHT], itemName: '炎爆魔杖', shape: { type: 'staff', parts: ['sphere', 'torus'] }, power: 35, rarity: 'rare' },
  { runes: [RuneType.WATER, RuneType.WATER, RuneType.WIND], itemName: '冰霜之刃', shape: { type: 'sword', parts: ['cube', 'cone'] }, power: 32, rarity: 'rare' },
  { runes: [RuneType.EARTH, RuneType.EARTH, RuneType.FIRE], itemName: '熔岩巨锤', shape: { type: 'sword', parts: ['cube', 'cylinder'] }, power: 40, rarity: 'rare' },
  { runes: [RuneType.WIND, RuneType.LIGHT, RuneType.DARK], itemName: '虚空法球', shape: { type: 'crystal', parts: ['icosahedron', 'sphere'] }, power: 60, rarity: 'legendary' },
  { runes: [RuneType.FIRE, RuneType.WATER, RuneType.LIGHT], itemName: '曙光之杖', shape: { type: 'staff', parts: ['sphere', 'torus', 'cone'] }, power: 42, rarity: 'rare' },
  { runes: [RuneType.EARTH, RuneType.WIND, RuneType.EARTH], itemName: '岩石铠甲', shape: { type: 'shield', parts: ['box', 'cylinder'] }, power: 38, rarity: 'rare' },
  { runes: [RuneType.LIGHT, RuneType.LIGHT, RuneType.DARK], itemName: '暮光圣典', shape: { type: 'book', parts: ['box', 'cylinder'] }, power: 50, rarity: 'epic' },
  { runes: [RuneType.FIRE, RuneType.WIND, RuneType.WIND], itemName: '风暴之眼', shape: { type: 'ring', parts: ['torus', 'sphere'] }, power: 28, rarity: 'common' },
  { runes: [RuneType.WATER, RuneType.EARTH, RuneType.LIGHT], itemName: '生命之泉', shape: { type: 'potion', parts: ['cylinder', 'sphere'] }, power: 40, rarity: 'rare' },
];

export const gameApi = {
  loading: false,

  async fetchRuneCombination(): Promise<CombinationRule[]> {
    this.loading = true;
    try {
      await delay(500);
      return staticRules;
    } finally {
      this.loading = false;
    }
  },

  async fetchRuneCombinationStatic(): Promise<CombinationRule[]> {
    return staticRules;
  },

  async craftItem(runes: RuneType[]): Promise<CraftResponse> {
    this.loading = true;
    try {
      await delay(500);
      
      const sortedRunes = [...runes].sort();
      const rules = await this.fetchRuneCombinationStatic();
      
      let matchedRule = rules.find(rule => {
        const sortedRule = [...rule.runes].sort();
        return sortedRule.length === sortedRunes.length && 
               sortedRule.every((r, i) => r === sortedRunes[i]);
      });

      if (!matchedRule) {
        const defaultNames = ['神秘护符', '奇异水晶', '符文之石', '魔法宝珠'];
        const shapes: Array<'amulet' | 'crystal' | 'ring' | 'potion'> = ['amulet', 'crystal', 'ring', 'potion'];
        const shapeIndex = Math.floor(Math.random() * shapes.length);
        const avgPower = Math.floor(runes.length * 10 + Math.random() * 10);
        
        return {
          success: true,
          item: {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: defaultNames[Math.floor(Math.random() * defaultNames.length)],
            runes: runes,
            shape: { type: shapes[shapeIndex], parts: ['sphere', 'torus'] },
            color: this.getMixedColor(runes),
            power: avgPower,
            level: 1,
            isPlaced: false,
          }
        };
      }

      return {
        success: true,
        item: {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: matchedRule.itemName,
          runes: runes,
          shape: matchedRule.shape,
          color: this.getMixedColor(runes),
          power: matchedRule.power,
          level: 1,
          isPlaced: false,
        }
      };
    } finally {
      this.loading = false;
    }
  },

  getMixedColor(runes: RuneType[]): string {
    const colorMap: Record<RuneType, string> = {
      [RuneType.FIRE]: '#FF4500',
      [RuneType.WATER]: '#1E90FF',
      [RuneType.WIND]: '#00FA9A',
      [RuneType.EARTH]: '#8B4513',
      [RuneType.LIGHT]: '#FFD700',
      [RuneType.DARK]: '#4B0082',
    };

    const colors = runes.map(r => colorMap[r]);
    return this.mixColors(colors);
  },

  mixColors(colors: string[]): string {
    if (colors.length === 0) return '#FFFFFF';
    if (colors.length === 1) return colors[0];

    let r = 0, g = 0, b = 0;
    colors.forEach(color => {
      const hex = color.replace('#', '');
      r += parseInt(hex.substr(0, 2), 16);
      g += parseInt(hex.substr(2, 2), 16);
      b += parseInt(hex.substr(4, 2), 16);
    });

    r = Math.floor(r / colors.length);
    g = Math.floor(g / colors.length);
    b = Math.floor(b / colors.length);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  },

  async fetchInventory(): Promise<InventoryResponse> {
    this.loading = true;
    try {
      await delay(500);
      const saved = localStorage.getItem('magic_workshop_inventory');
      if (saved) {
        return JSON.parse(saved);
      }
      return {
        items: [],
        gold: 500
      };
    } finally {
      this.loading = false;
    }
  },

  async upgradeItem(item1Id: string, item2Id: string, items: MagicItem[]): Promise<UpgradeResponse> {
    this.loading = true;
    try {
      await delay(500);
      
      const item1 = items.find(i => i.id === item1Id);
      const item2 = items.find(i => i.id === item2Id);

      if (!item1 || !item2) {
        return { success: false, message: '物品不存在' };
      }

      const allRunes = [...item1.runes, ...item2.runes].slice(0, 3) as RuneType[];
      const newPower = Math.floor((item1.power + item2.power) * 1.5);
      const newLevel = Math.max(item1.level, item2.level) + 1;

      const result = await this.craftItem(allRunes);
      
      if (result.success && result.item) {
        return {
          success: true,
          item: {
            ...result.item,
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            power: newPower,
            level: newLevel,
            name: `强化·${result.item.name}`,
            isPlaced: false,
          }
        };
      }

      return { success: false, message: '融合失败' };
    } finally {
      this.loading = false;
    }
  },

  async saveGame(items: MagicItem[], gold: number): Promise<boolean> {
    this.loading = true;
    try {
      await delay(300);
      localStorage.setItem('magic_workshop_inventory', JSON.stringify({ items, gold }));
      return true;
    } finally {
      this.loading = false;
    }
  }
};
