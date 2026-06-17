export type HeroClass = 'warrior' | 'mage' | 'archer' | 'tank' | 'assassin' | 'support';

export interface Skill {
  id: string;
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  range: number;
  type: 'damage' | 'heal' | 'buff' | 'debuff';
  icon: string;
}

export interface Hero {
  id: string;
  name: string;
  heroClass: HeroClass;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  skills: Skill[];
  avatar: string;
  kills: number;
  damageDealt: number;
  damageTaken: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface PlacedHero extends Hero {
  position: GridPosition;
}

export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  position: GridPosition;
  avatar: string;
  isEnemy: true;
}

export interface BattleUnit extends PlacedHero {
  isEnemy?: boolean;
  currentCooldowns: Record<string, number>;
  actionState: 'idle' | 'moving' | 'attacking' | 'casting' | 'dead';
  targetId?: string;
}

export interface BattleFrame {
  frameIndex: number;
  turn: number;
  units: BattleUnit[];
  log: string;
}

export interface BattleResult {
  id: string;
  timestamp: number;
  totalTurns: number;
  victory: 'win' | 'lose' | 'draw';
  duration: number;
  heroStats: {
    heroId: string;
    heroName: string;
    kills: number;
    damageDealt: number;
    damageTaken: number;
  }[];
  frames: BattleFrame[];
  heroIds: string[];
  enemyWaveId: string;
}

export interface WaveEnemy {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  avatar: string;
  startPosition: GridPosition;
}

export interface WaveConfig {
  id: string;
  name: string;
  difficulty: 'easy' | 'normal' | 'hard';
  enemies: WaveEnemy[];
}

export interface FormationConfig {
  heroes: { heroId: string; position: GridPosition }[];
}
