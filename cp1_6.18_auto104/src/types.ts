export type ElementType = 'fire' | 'ice' | 'lightning';

export type BossState = 'idle' | 'attack' | 'defend' | 'enrage' | 'summon';

export interface Skill {
  id: string;
  name: string;
  element: ElementType;
  baseDamage: number;
  cooldown: number;
  description: string;
}

export interface BossStats {
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  fireResist: number;
  iceResist: number;
  lightningResist: number;
  skills: Skill[];
}

export interface Boss extends BossStats {
  id: string;
  name: string;
  state: BossState;
  position: { x: number; y: number };
  stateTransitionTime: number;
  isTransitioning: boolean;
  stunDuration: number;
}

export interface Minion extends BossStats {
  id: string;
  position: { x: number; y: number };
  alive: boolean;
}

export interface PlayerStats {
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  level: number;
  equipmentScore: number;
}

export interface Player extends PlayerStats {
  position: { x: number; y: number };
  actionCooldown: number;
  dodgeCooldown: number;
  skillCooldowns: Record<string, number>;
}

export interface DamageNumber {
  id: string;
  value: number;
  x: number;
  y: number;
  opacity: number;
  isCrit: boolean;
  element?: ElementType;
}

export interface SkillEffect {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  duration: number;
  maxDuration: number;
}

export interface BattleLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'damage' | 'heal' | 'state' | 'system';
}

export interface BattleState {
  player: Player;
  boss: Boss;
  minions: Minion[];
  damageNumbers: DamageNumber[];
  skillEffects: SkillEffect[];
  battleLog: BattleLogEntry[];
  screenShake: number;
  isPlayerTurn: boolean;
  turnTimer: number;
  battleResult: 'ongoing' | 'victory' | 'defeat' | null;
  consecutiveWins: number;
  consecutiveLosses: number;
  difficultyModifier: number;
  balanceAdjustmentMessage: string | null;
}

export interface PlayerAction {
  type: 'attack' | 'dodge' | 'skill';
  skillId?: string;
}

export interface BossBehavior {
  state: BossState;
  action: string;
  targetSkill?: Skill;
}
