export type PokemonType = 'fire' | 'water' | 'grass' | 'electric' | 'rock' | 'ghost';

export interface Skill {
  name: string;
  power: number;
  accuracy: number;
  effect: string;
  effectType?: 'damage' | 'burn' | 'heal' | 'stun' | 'boost';
}

export interface Pokemon {
  id: string;
  name: string;
  type: PokemonType;
  emoji: string;
  hp: number;
  speed: number;
  skills: Skill[];
}

export const typeAdvantage: Record<PokemonType, PokemonType[]> = {
  fire: ['grass'],
  water: ['fire', 'rock'],
  grass: ['water', 'rock'],
  electric: ['water'],
  rock: ['fire', 'electric'],
  ghost: ['ghost'],
};

export const typeConfig: Record<PokemonType, { label: string; gradient: string; ring: string; icon: string }> = {
  fire: {
    label: '火',
    gradient: 'linear-gradient(135deg, #ff6b35, #f7931e)',
    ring: '#ff6b35',
    icon: '🔥',
  },
  water: {
    label: '水',
    gradient: 'linear-gradient(135deg, #2196f3, #00bcd4)',
    ring: '#2196f3',
    icon: '💧',
  },
  grass: {
    label: '草',
    gradient: 'linear-gradient(135deg, #4caf50, #8bc34a)',
    ring: '#4caf50',
    icon: '🌿',
  },
  electric: {
    label: '电',
    gradient: 'linear-gradient(135deg, #ffc107, #ffeb3b)',
    ring: '#ffc107',
    icon: '⚡',
  },
  rock: {
    label: '岩',
    gradient: 'linear-gradient(135deg, #8d6e63, #a1887f)',
    ring: '#8d6e63',
    icon: '🪨',
  },
  ghost: {
    label: '幽灵',
    gradient: 'linear-gradient(135deg, #9c27b0, #7b1fa2)',
    ring: '#9c27b0',
    icon: '👻',
  },
};

const fireSkills: Skill[] = [
  { name: '火焰拳', power: 75, accuracy: 95, effect: '造成火属性伤害', effectType: 'damage' },
  { name: '喷射火焰', power: 90, accuracy: 85, effect: '有几率烧伤目标', effectType: 'burn' },
  { name: '爆炎电击', power: 120, accuracy: 70, effect: '高威力但自身会受反伤', effectType: 'damage' },
  { name: '火焰旋涡', power: 60, accuracy: 90, effect: '连续多回合造成伤害', effectType: 'damage' },
];

const waterSkills: Skill[] = [
  { name: '水枪', power: 65, accuracy: 100, effect: '稳定的水属性攻击', effectType: 'damage' },
  { name: '水炮', power: 95, accuracy: 80, effect: '高威力水属性伤害', effectType: 'damage' },
  { name: '泡沫光线', power: 55, accuracy: 95, effect: '有几率降低对手速度', effectType: 'damage' },
  { name: '自我再生', power: 0, accuracy: 100, effect: '恢复自身最大HP的一半', effectType: 'heal' },
];

const grassSkills: Skill[] = [
  { name: '藤鞭', power: 60, accuracy: 100, effect: '藤蔓抽击目标', effectType: 'damage' },
  { name: '飞叶快刀', power: 75, accuracy: 95, effect: '锋利的叶片攻击', effectType: 'damage' },
  { name: '阳光烈焰', power: 130, accuracy: 75, effect: '蓄力后释放超强光束', effectType: 'damage' },
  { name: '寄生种子', power: 50, accuracy: 90, effect: '每回合吸取目标HP', effectType: 'damage' },
];

const electricSkills: Skill[] = [
  { name: '电击', power: 55, accuracy: 100, effect: '基础电属性攻击', effectType: 'damage' },
  { name: '十万伏特', power: 90, accuracy: 85, effect: '有几率使目标麻痹', effectType: 'stun' },
  { name: '打雷', power: 110, accuracy: 70, effect: '高威力雷电攻击', effectType: 'damage' },
  { name: '电光一闪', power: 45, accuracy: 100, effect: '必定先手攻击', effectType: 'boost' },
];

const rockSkills: Skill[] = [
  { name: '落石', power: 60, accuracy: 95, effect: '岩石砸击目标', effectType: 'damage' },
  { name: '岩崩', power: 85, accuracy: 85, effect: '有几率使目标畏缩', effectType: 'damage' },
  { name: '岩石炮', power: 120, accuracy: 70, effect: '极高威力岩石攻击', effectType: 'damage' },
  { name: '岩石打磨', power: 0, accuracy: 100, effect: '大幅提升自身防御', effectType: 'boost' },
];

const ghostSkills: Skill[] = [
  { name: '舌舔', power: 45, accuracy: 100, effect: '有几率使目标麻痹', effectType: 'damage' },
  { name: '影子球', power: 80, accuracy: 90, effect: '有几率降低对手特防', effectType: 'damage' },
  { name: '暗影爪', power: 75, accuracy: 95, effect: '容易击中要害', effectType: 'damage' },
  { name: '灭亡之歌', power: 0, accuracy: 90, effect: '3回合后双方陷入濒死', effectType: 'damage' },
];

export const pokemonList: Pokemon[] = [
  { id: 'fire-1', name: '小火龙', type: 'fire', emoji: '🦎', hp: 120, speed: 85, skills: fireSkills },
  { id: 'fire-2', name: '火恐龙', type: 'fire', emoji: '🦖', hp: 140, speed: 90, skills: fireSkills },
  { id: 'fire-3', name: '烈焰马', type: 'fire', emoji: '🔥', hp: 130, speed: 110, skills: fireSkills },
  { id: 'fire-4', name: '风速狗', type: 'fire', emoji: '🐕', hp: 150, speed: 95, skills: fireSkills },

  { id: 'water-1', name: '杰尼龟', type: 'water', emoji: '🐢', hp: 130, speed: 70, skills: waterSkills },
  { id: 'water-2', name: '卡咪龟', type: 'water', emoji: '🐢', hp: 150, speed: 75, skills: waterSkills },
  { id: 'water-3', name: '暴鲤龙', type: 'water', emoji: '🐉', hp: 180, speed: 85, skills: waterSkills },
  { id: 'water-4', name: '水精灵', type: 'water', emoji: '🦭', hp: 160, speed: 80, skills: waterSkills },

  { id: 'grass-1', name: '妙蛙种子', type: 'grass', emoji: '🌱', hp: 125, speed: 75, skills: grassSkills },
  { id: 'grass-2', name: '妙蛙草', type: 'grass', emoji: '🌿', hp: 145, speed: 80, skills: grassSkills },
  { id: 'grass-3', name: '大菊花', type: 'grass', emoji: '🌼', hp: 155, speed: 85, skills: grassSkills },
  { id: 'grass-4', name: '蜥蜴王', type: 'grass', emoji: '🦎', hp: 150, speed: 100, skills: grassSkills },

  { id: 'electric-1', name: '皮卡丘', type: 'electric', emoji: '🐭', hp: 110, speed: 100, skills: electricSkills },
  { id: 'electric-2', name: '雷丘', type: 'electric', emoji: '🐿️', hp: 135, speed: 105, skills: electricSkills },
  { id: 'electric-3', name: '闪电鸟', type: 'electric', emoji: '🦅', hp: 140, speed: 115, skills: electricSkills },
  { id: 'electric-4', name: '雷精灵', type: 'electric', emoji: '⚡', hp: 130, speed: 120, skills: electricSkills },

  { id: 'rock-1', name: '小拳石', type: 'rock', emoji: '🪨', hp: 140, speed: 55, skills: rockSkills },
  { id: 'rock-2', name: '隆隆石', type: 'rock', emoji: '⛰️', hp: 160, speed: 60, skills: rockSkills },
  { id: 'rock-3', name: '岩神柱', type: 'rock', emoji: '🗿', hp: 180, speed: 50, skills: rockSkills },
  { id: 'rock-4', name: '化石翼龙', type: 'rock', emoji: '🦴', hp: 155, speed: 105, skills: rockSkills },

  { id: 'ghost-1', name: '鬼斯', type: 'ghost', emoji: '👻', hp: 115, speed: 95, skills: ghostSkills },
  { id: 'ghost-2', name: '鬼斯通', type: 'ghost', emoji: '👻', hp: 135, speed: 100, skills: ghostSkills },
  { id: 'ghost-3', name: '耿鬼', type: 'ghost', emoji: '😈', hp: 145, speed: 115, skills: ghostSkills },
  { id: 'ghost-4', name: '夜巨人', type: 'ghost', emoji: '🧙', hp: 165, speed: 65, skills: ghostSkills },
];

export const getPokemonByType = (type: PokemonType): Pokemon[] => {
  return pokemonList.filter(p => p.type === type);
};

export const calculateDamage = (
  attacker: Pokemon,
  defender: Pokemon,
  skill: Skill
): { damage: number; effectiveness: 'super' | 'normal' | 'weak' | 'heal' } => {
  if (skill.effectType === 'heal') {
    return { damage: Math.floor(attacker.hp * 0.5), effectiveness: 'heal' };
  }

  let baseDamage = skill.power;
  const advantages = typeAdvantage[attacker.type];
  const defenderWeakTo = advantages?.includes(defender.type);
  const defenderResists = typeAdvantage[defender.type]?.includes(attacker.type);

  let effectiveness: 'super' | 'normal' | 'weak' = 'normal';

  if (defenderWeakTo) {
    baseDamage = Math.floor(baseDamage * 1.5);
    effectiveness = 'super';
  } else if (defenderResists) {
    baseDamage = Math.floor(baseDamage * 0.6);
    effectiveness = 'weak';
  }

  baseDamage = Math.floor(baseDamage * (0.85 + Math.random() * 0.3));

  return { damage: baseDamage, effectiveness };
};
