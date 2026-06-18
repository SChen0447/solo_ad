import type { Boss, BossStats, Skill, ElementType } from '../types';

const BOSS_NAMES = [
  '暗影巨龙', '炎魔领主', '冰霜巨人', '雷霆泰坦',
  '虚空行者', '深渊守卫', '混沌使者', '末日审判者'
];

const SKILL_POOL: Skill[] = [
  {
    id: 'fireball',
    name: '火球术',
    element: 'fire',
    baseDamage: 45,
    cooldown: 3000,
    description: '发射一颗炽热的火球'
  },
  {
    id: 'inferno',
    name: '地狱烈焰',
    element: 'fire',
    baseDamage: 60,
    cooldown: 5000,
    description: '释放范围火焰伤害'
  },
  {
    id: 'ice_spike',
    name: '冰锥术',
    element: 'ice',
    baseDamage: 40,
    cooldown: 2500,
    description: '召唤尖锐的冰锥刺穿敌人'
  },
  {
    id: 'blizzard',
    name: '暴风雪',
    element: 'ice',
    baseDamage: 55,
    cooldown: 4500,
    description: '召唤暴风雪冻结敌人'
  },
  {
    id: 'lightning_bolt',
    name: '闪电箭',
    element: 'lightning',
    baseDamage: 50,
    cooldown: 2800,
    description: '释放一道迅猛的闪电'
  },
  {
    id: 'thunder_storm',
    name: '雷暴',
    element: 'lightning',
    baseDamage: 65,
    cooldown: 5500,
    description: '召唤雷暴轰击敌人'
  }
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomUniqueSkills(count: number): Skill[] {
  const shuffled = [...SKILL_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function calculateDifficultyCurve(playerLevel: number, equipmentScore: number): number {
  const levelFactor = Math.pow(playerLevel / 10, 1.2);
  const equipFactor = Math.pow(equipmentScore / 100, 0.8);
  return 1 + (levelFactor + equipFactor) * 0.5;
}

export function generateBossStats(
  playerLevel: number,
  equipmentScore: number,
  difficultyModifier: number = 1
): BossStats {
  const difficulty = calculateDifficultyCurve(playerLevel, equipmentScore) * difficultyModifier;

  const baseHp = 500 + playerLevel * 80;
  const baseAttack = 30 + playerLevel * 8;
  const baseDefense = 15 + playerLevel * 4;
  const baseSpeed = 50 + playerLevel * 2;

  const hp = Math.floor(baseHp * difficulty);
  const attack = Math.floor(baseAttack * difficulty);
  const defense = Math.floor(baseDefense * difficulty);
  const speed = Math.floor(baseSpeed * (1 + (Math.random() - 0.5) * 0.2));

  const fireResist = Math.floor(20 + Math.random() * 60);
  const iceResist = Math.floor(20 + Math.random() * 60);
  const lightningResist = Math.floor(20 + Math.random() * 60);

  const skills = getRandomUniqueSkills(3);

  return {
    maxHp: hp,
    currentHp: hp,
    attack,
    defense,
    speed,
    fireResist,
    iceResist,
    lightningResist,
    skills
  };
}

export function generateBoss(
  playerLevel: number,
  equipmentScore: number,
  position: { x: number; y: number },
  difficultyModifier: number = 1
): Boss {
  const stats = generateBossStats(playerLevel, equipmentScore, difficultyModifier);
  const name = getRandomElement(BOSS_NAMES);

  return {
    ...stats,
    id: `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    state: 'idle',
    position,
    stateTransitionTime: 0,
    isTransitioning: false,
    stunDuration: 0
  };
}

export function generateMinion(
  boss: Boss,
  position: { x: number; y: number }
) {
  const weaknessFactor = 0.4;
  const skills = getRandomUniqueSkills(1);

  return {
    id: `minion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    maxHp: Math.floor(boss.maxHp * weaknessFactor),
    currentHp: Math.floor(boss.maxHp * weaknessFactor),
    attack: Math.floor(boss.attack * weaknessFactor),
    defense: Math.floor(boss.defense * weaknessFactor),
    speed: Math.floor(boss.speed * 0.8),
    fireResist: boss.fireResist,
    iceResist: boss.iceResist,
    lightningResist: boss.lightningResist,
    skills,
    position,
    alive: true
  };
}

export function getResistByElement(boss: Boss, element: ElementType): number {
  switch (element) {
    case 'fire': return boss.fireResist;
    case 'ice': return boss.iceResist;
    case 'lightning': return boss.lightningResist;
  }
}
