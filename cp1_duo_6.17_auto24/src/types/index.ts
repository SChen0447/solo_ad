export interface Skill {
  id: string;
  name: string;
  damageCoefficient: number;
  cooldown: number;
  currentCooldown: number;
  description: string;
}

export interface CombatUnit {
  id: string;
  name: string;
  type: 'character' | 'monster';
  icon: string;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  critRate: number;
  dodgeRate: number;
  speed: number;
  skills: Skill[];
  isAlive: boolean;
}

export interface LogEntry {
  id: string;
  round: number;
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  skillName: string;
  isHit: boolean;
  isCrit: boolean;
  damage: number;
  timestamp: number;
}

export interface BattleStats {
  totalDamageBySide: {
    characters: number;
    monsters: number;
  };
  totalHealing: number;
  dodgeCount: {
    characters: number;
    monsters: number;
  };
  critCount: {
    characters: number;
    monsters: number;
  };
  damageByUnit: Record<string, number>;
}

export interface SimulateRequest {
  characters: CombatUnit[];
  monsters: CombatUnit[];
  maxRounds?: number;
}

export interface SimulateResponse {
  success: boolean;
  winner: 'characters' | 'monsters' | 'draw';
  totalRounds: number;
  logs: LogEntry[];
  stats: BattleStats;
  error?: string;
}

export type UnitAttribute =
  | 'maxHp'
  | 'attack'
  | 'defense'
  | 'critRate'
  | 'dodgeRate'
  | 'speed';

export interface AttributeConfig {
  key: UnitAttribute;
  label: string;
  min: number;
  max: number;
  unit?: string;
}

export const ATTRIBUTE_CONFIGS: AttributeConfig[] = [
  { key: 'maxHp', label: '生命值', min: 100, max: 2000 },
  { key: 'attack', label: '攻击力', min: 10, max: 500 },
  { key: 'defense', label: '防御力', min: 5, max: 300 },
  { key: 'critRate', label: '暴击率', min: 0, max: 100, unit: '%' },
  { key: 'dodgeRate', label: '闪避率', min: 0, max: 50, unit: '%' },
  { key: 'speed', label: '速度', min: 1, max: 200 },
];

export const CHARACTER_ICONS = ['⚔️', '🛡️', '🏹', '🧙', '⚡', '🗡️', '🔮', '💚'];
export const MONSTER_ICONS = ['👹', '🐉', '💀', '👻', '🦇', '🕷️', '🐺', '🌋'];

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const createDefaultSkill = (index: number): Skill => ({
  id: generateId(),
  name: `技能${index + 1}`,
  damageCoefficient: 1.0,
  cooldown: 2,
  currentCooldown: 0,
  description: '造成100%攻击力伤害',
});

export const createDefaultCharacter = (): CombatUnit => ({
  id: generateId(),
  name: '角色',
  type: 'character',
  icon: CHARACTER_ICONS[0],
  maxHp: 1000,
  currentHp: 1000,
  attack: 150,
  defense: 100,
  critRate: 20,
  dodgeRate: 10,
  speed: 80,
  skills: [createDefaultSkill(0)],
  isAlive: true,
});

export const createDefaultMonster = (): CombatUnit => ({
  id: generateId(),
  name: '怪物',
  type: 'monster',
  icon: MONSTER_ICONS[0],
  maxHp: 800,
  currentHp: 800,
  attack: 120,
  defense: 80,
  critRate: 15,
  dodgeRate: 8,
  speed: 60,
  skills: [createDefaultSkill(0)],
  isAlive: true,
});
