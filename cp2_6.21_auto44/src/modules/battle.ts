import type { IHero } from './character';
import { generateEquipment, type IEquipment } from './equipment';

export type MonsterType = 'slime' | 'skeleton' | 'bat' | 'goblin';
export type BattleAction = 'attack' | 'defend' | 'potion';
export type BattlePhase = 'player' | 'enemy' | 'victory' | 'defeat' | 'animating';

export interface IMonster {
  id: string;
  type: MonsterType;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  color: string;
  sprite: number[][];
}

export interface IBattleResult {
  victory: boolean;
  expGained: number;
  drop?: IEquipment;
  heroHp: number;
}

export interface IBattleState {
  hero: IHero;
  monster: IMonster;
  phase: BattlePhase;
  logs: string[];
  isDefending: boolean;
  animatingHero: boolean;
  animatingMonster: boolean;
}

const MONSTER_DATA: Record<MonsterType, {
  name: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  color: string;
  sprite: number[][];
}> = {
  slime: {
    name: '史莱姆',
    baseHp: 40, baseAtk: 6, baseDef: 2, baseSpd: 4,
    color: '#4ADE80',
    sprite: [
      [0,0,1,1,1,1,0,0],
      [0,1,2,2,2,2,1,0],
      [1,2,1,2,2,1,2,1],
      [1,2,2,2,2,2,2,1],
      [1,2,1,2,2,1,2,1],
      [0,1,2,2,2,2,1,0],
      [0,0,1,1,1,1,0,0],
    ],
  },
  skeleton: {
    name: '骷髅',
    baseHp: 60, baseAtk: 10, baseDef: 5, baseSpd: 6,
    color: '#E5E7EB',
    sprite: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,2,1,1,2,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,2,2,1,1,0],
      [0,1,1,1,1,1,1,0],
      [0,1,0,1,1,0,1,0],
    ],
  },
  bat: {
    name: '蝙蝠',
    baseHp: 35, baseAtk: 8, baseDef: 2, baseSpd: 14,
    color: '#A78BFA',
    sprite: [
      [1,0,0,0,0,0,0,1],
      [1,1,0,1,1,0,1,1],
      [1,1,1,1,1,1,1,1],
      [1,2,1,1,1,1,2,1],
      [0,1,1,2,2,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,0,0,1,1,0,0,0],
    ],
  },
  goblin: {
    name: '哥布林',
    baseHp: 55, baseAtk: 9, baseDef: 4, baseSpd: 8,
    color: '#65A30D',
    sprite: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,2,2,1,1,0],
      [1,1,3,1,1,3,1,1],
      [1,1,1,1,1,1,1,1],
      [0,1,1,3,3,1,1,0],
      [0,0,1,1,1,1,0,0],
      [0,1,1,0,0,1,1,0],
    ],
  },
};

export function generateMonster(playerLevel: number): IMonster {
  const types: MonsterType[] = ['slime', 'skeleton', 'bat', 'goblin'];
  const type = types[Math.floor(Math.random() * types.length)];
  const data = MONSTER_DATA[type];
  const level = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
  const scale = 1 + (level - 1) * 0.15;
  const maxHp = Math.floor(data.baseHp * scale);
  return {
    id: Math.random().toString(36).slice(2, 10),
    type,
    name: data.name,
    level,
    hp: maxHp,
    maxHp,
    atk: Math.floor(data.baseAtk * scale),
    def: Math.floor(data.baseDef * scale),
    spd: Math.floor(data.baseSpd * scale),
    color: data.color,
    sprite: data.sprite,
  };
}

export function generateMapMonsters(playerLevel: number): IMonster[] {
  return Array.from({ length: 4 }, () => generateMonster(playerLevel));
}

export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  isDefending: boolean = false
): number {
  const defMultiplier = isDefending ? 2.5 : 1;
  const effectiveDef = defenderDef * defMultiplier;
  const base = Math.max(1, attackerAtk - effectiveDef);
  const variance = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.floor(base * variance));
}

export function startBattle(hero: IHero, monster: IMonster): IBattleState {
  return {
    hero: JSON.parse(JSON.stringify(hero)),
    monster: JSON.parse(JSON.stringify(monster)),
    phase: monster.spd > hero.spd ? 'enemy' : 'player',
    logs: [`⚔ 遭遇了 Lv.${monster.level} ${monster.name}！战斗开始！`],
    isDefending: false,
    animatingHero: false,
    animatingMonster: false,
  };
}

const healPotionAmount = 30;

export function executePlayerAction(
  state: IBattleState,
  action: BattleAction
): IBattleState {
  if (state.phase !== 'player') return state;
  const s: IBattleState = JSON.parse(JSON.stringify(state));
  s.isDefending = false;
  s.animatingHero = true;

  if (action === 'attack') {
    const damage = calculateDamage(s.hero.atk + Math.floor(s.hero.matk * 0.3), s.monster.def);
    s.monster.hp = Math.max(0, s.monster.hp - damage);
    s.logs.push(`🗡 你对${s.monster.name}造成了 ${damage} 点伤害！`);
  } else if (action === 'defend') {
    s.isDefending = true;
    s.logs.push(`🛡 你进入了防御姿态！防御力大幅提升。`);
  } else if (action === 'potion') {
    if (s.hero.potions <= 0) {
      s.logs.push(`❌ 药水已经用完了！`);
      s.animatingHero = false;
      return s;
    }
    s.hero.potions -= 1;
    const healed = Math.min(healPotionAmount, s.hero.maxHp - s.hero.hp);
    s.hero.hp += healed;
    s.logs.push(`🧪 使用了初级治疗药水，恢复 ${healed} 点HP！`);
  }

  if (s.monster.hp <= 0) {
    s.phase = 'victory';
    s.logs.push(`✨ ${s.monster.name} 被击败了！胜利！`);
  } else {
    s.phase = 'enemy';
  }
  return s;
}

export function executeEnemyTurn(state: IBattleState): IBattleState {
  if (state.phase !== 'enemy') return state;
  const s: IBattleState = JSON.parse(JSON.stringify(state));
  s.animatingMonster = true;
  const damage = calculateDamage(s.monster.atk, s.hero.def, s.isDefending);
  s.hero.hp = Math.max(0, s.hero.hp - damage);
  s.logs.push(`💥 ${s.monster.name}对你造成了 ${damage} 点伤害！`);
  s.isDefending = false;
  if (s.hero.hp <= 0) {
    s.phase = 'defeat';
    s.logs.push(`💀 你被击败了... 游戏结束。`);
  } else {
    s.phase = 'player';
  }
  return s;
}

export function clearAnimations(state: IBattleState): IBattleState {
  const s: IBattleState = JSON.parse(JSON.stringify(state));
  s.animatingHero = false;
  s.animatingMonster = false;
  return s;
}

export function checkVictory(state: IBattleState): 'player' | 'enemy' | null {
  if (state.monster.hp <= 0) return 'player';
  if (state.hero.hp <= 0) return 'enemy';
  return null;
}

export function buildBattleResult(
  state: IBattleState,
  heroLevel: number
): IBattleResult {
  const victory = state.hero.hp > 0 && state.monster.hp <= 0;
  const expGained = victory
    ? state.monster.level * 10 + Math.floor(Math.random() * 11)
    : 0;
  let drop: IEquipment | undefined;
  if (victory && Math.random() < 0.7) {
    drop = generateEquipment(state.monster.level);
  }
  return {
    victory,
    expGained,
    drop,
    heroHp: state.hero.hp,
  };
}
