import axios from 'axios';
import { AffixData, MonsterData, MaterialData, BestiaryResponse } from '../models/TypeDefinitions';

const AFFIX_PREFIXES: Record<string, string> = {
  fire: '炎',
  ice: '霜',
  steel: '铁',
  shadow: '暗',
  crystal: '晶',
  root: '木',
  thunder: '雷',
  rock: '岩',
  dragonblood: '龙',
  stardust: '星',
};

const MONSTER_SUFFIXES = [
  '魔', '兽', '灵', '傀', '鬼', '卫', '侍', '将', '王', '煞',
  '魔像', '猎手', '守卫', '行者', '狂徒', '骑士', '术士',
];

const BASE_HP = 80;
const BASE_ATK = 12;
const BASE_DEF = 8;

class MonsterGenerator {
  private affixes: AffixData[] = [];
  private loaded: boolean = false;

  async loadAffixes(): Promise<void> {
    if (this.loaded && this.affixes.length > 0) return;
    try {
      const response = await axios.get<BestiaryResponse>('/api/bestiary');
      this.affixes = response.data.affixes;
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load affixes from backend, using fallback:', error);
      this.affixes = this.getFallbackAffixes();
      this.loaded = true;
    }
  }

  generateMonster(unlockedAffixes: string[] = []): MonsterData {
    const availableAffixes = this.affixes.filter(a =>
      !['dragonblood', 'stardust'].includes(a.id) || unlockedAffixes.includes(a.id)
    );

    const affixCount = 2 + Math.floor(Math.random() * 2);
    const shuffled = [...availableAffixes].sort(() => Math.random() - 0.5);
    const selectedAffixes = shuffled.slice(0, Math.min(affixCount, shuffled.length));

    if (selectedAffixes.length === 0) {
      const fallback: AffixData = this.getFallbackAffixes()[0];
      selectedAffixes.push(fallback);
    }

    const hpMod = selectedAffixes.reduce((sum, a) => sum + a.hpMod, 0) / selectedAffixes.length;
    const atkMod = selectedAffixes.reduce((sum, a) => sum * a.atkMod, 1);
    const defMod = selectedAffixes.reduce((sum, a) => sum * a.defMod, 1);

    const hp = Math.round(BASE_HP * hpMod * selectedAffixes.length);
    const attack = Math.round(BASE_ATK * atkMod);
    const defense = Math.round(BASE_DEF * defMod);
    const attackType = selectedAffixes.filter(a => a.attackType === 'magical').length > selectedAffixes.length / 2
      ? 'magical' : 'physical';

    const color = this.blendColors(selectedAffixes.map(a => a.color));
    const particleColor = this.blendColors(selectedAffixes.map(a => a.particleColor));

    const name = this.generateName(selectedAffixes);

    const drops: MaterialData[] = [];
    for (const affix of selectedAffixes) {
      const materialIdx = Math.floor(Math.random() * affix.materials.length);
      drops.push(affix.materials[materialIdx]);
    }
    const extraDrop = Math.random() < 0.4;
    if (extraDrop && selectedAffixes.length > 1) {
      const randomAffix = selectedAffixes[Math.floor(Math.random() * selectedAffixes.length)];
      const materialIdx = Math.floor(Math.random() * randomAffix.materials.length);
      const mat = randomAffix.materials[materialIdx];
      if (!drops.find(d => d.id === mat.id)) {
        drops.push(mat);
      }
    }

    return {
      id: `monster_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name,
      affixes: selectedAffixes,
      hp,
      maxHp: hp,
      attack,
      defense,
      attackType,
      color,
      particleColor,
      drops,
    };
  }

  private generateName(affixes: AffixData[]): string {
    const prefix = affixes.map(a => AFFIX_PREFIXES[a.id] || a.name.charAt(0)).join('');
    const suffix = MONSTER_SUFFIXES[Math.floor(Math.random() * MONSTER_SUFFIXES.length)];
    return `${prefix}${suffix}`;
  }

  private blendColors(colors: string[]): string {
    if (colors.length === 0) return '#888888';
    if (colors.length === 1) return colors[0];

    let r = 0, g = 0, b = 0;
    for (const hex of colors) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        r += parseInt(result[1], 16);
        g += parseInt(result[2], 16);
        b += parseInt(result[3], 16);
      }
    }
    r = Math.round(r / colors.length);
    g = Math.round(g / colors.length);
    b = Math.round(b / colors.length);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private getFallbackAffixes(): AffixData[] {
    return [
      { id: 'fire', name: '火焰', nameEn: 'fire', color: '#ff4422', particleColor: '#ff6600', hpMod: 1.0, atkMod: 1.3, defMod: 0.8, attackType: 'magical', materials: [{ id: 'fire_crystal', name: '火焰结晶' }, { id: 'ash_powder', name: '灰烬粉末' }] },
      { id: 'ice', name: '寒冰', nameEn: 'ice', color: '#44aaff', particleColor: '#88ccff', hpMod: 1.2, atkMod: 1.0, defMod: 1.2, attackType: 'magical', materials: [{ id: 'ice_shard', name: '寒冰碎片' }, { id: 'frost_essence', name: '霜华精华' }] },
      { id: 'steel', name: '钢铁', nameEn: 'steel', color: '#999999', particleColor: '#cccccc', hpMod: 1.5, atkMod: 1.1, defMod: 1.5, attackType: 'physical', materials: [{ id: 'steel_fragment', name: '钢铁碎片' }, { id: 'iron_dust', name: '铁尘' }] },
      { id: 'shadow', name: '暗影', nameEn: 'shadow', color: '#6622aa', particleColor: '#9944dd', hpMod: 0.8, atkMod: 1.5, defMod: 0.7, attackType: 'magical', materials: [{ id: 'shadow_essence', name: '暗影精华' }, { id: 'void_dust', name: '虚空之尘' }] },
      { id: 'crystal', name: '水晶', nameEn: 'crystal', color: '#dd66ff', particleColor: '#ff88ff', hpMod: 0.9, atkMod: 1.4, defMod: 1.0, attackType: 'magical', materials: [{ id: 'crystal_core', name: '水晶核心' }, { id: 'prism_shard', name: '棱镜碎片' }] },
      { id: 'root', name: '树根', nameEn: 'root', color: '#886633', particleColor: '#aa8844', hpMod: 1.8, atkMod: 0.7, defMod: 1.3, attackType: 'physical', materials: [{ id: 'root_fiber', name: '树根纤维' }, { id: 'bark_scale', name: '树皮鳞片' }] },
      { id: 'thunder', name: '雷电', nameEn: 'thunder', color: '#ffee44', particleColor: '#ffff88', hpMod: 0.7, atkMod: 1.6, defMod: 0.6, attackType: 'magical', materials: [{ id: 'thunder_spark', name: '雷电火花' }, { id: 'storm_core', name: '风暴核心' }] },
      { id: 'rock', name: '岩石', nameEn: 'rock', color: '#887766', particleColor: '#aa9988', hpMod: 2.0, atkMod: 0.8, defMod: 1.8, attackType: 'physical', materials: [{ id: 'rock_chunk', name: '岩石碎块' }, { id: 'granite_dust', name: '花岗岩粉尘' }] },
    ];
  }
}

export const monsterGenerator = new MonsterGenerator();
