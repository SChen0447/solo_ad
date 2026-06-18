export type ElementType = 'fire' | 'water' | 'wind' | 'thunder' | 'earth' | 'light' | 'dark';

export type TerrainType = 'grass' | 'sand' | 'ruins' | 'normal';

export type StatusEffectType = 'burn' | 'paralyze' | 'poison' | 'defense_up' | 'attack_up' | 'stun';

export type SkillEffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'aoe_damage';

export type Team = 'A' | 'B';

export interface GridCoord {
  x: number;
  y: number;
}

export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  duration: number;
  value: number;
  sourceElement?: ElementType;
}

export interface Skill {
  id: string;
  name: string;
  element: ElementType;
  cost: number;
  cooldown: number;
  currentCooldown: number;
  range: number;
  aoeRange: number;
  effectType: SkillEffectType;
  power: number;
  description: string;
  targetType: 'enemy' | 'ally' | 'self' | 'position';
}

export interface Character {
  id: string;
  name: string;
  team: Team;
  avatar: string;
  maxHp: number;
  currentHp: number;
  maxEnergy: number;
  currentEnergy: number;
  attack: number;
  defense: number;
  position: GridCoord | null;
  skills: Skill[];
  statusEffects: StatusEffect[];
  isAlive: boolean;
}

export interface ComboRule {
  id: string;
  name: string;
  description: string;
  elements: [ElementType, ElementType];
  effect: (
    source: Character,
    target: Character,
    battleState: BattleState,
    eventLog: BattleEvent[]
  ) => { affectedTargets: string[]; extraDamage: number; eventLog: BattleEvent[] };
}

export interface GridCell {
  coord: GridCoord;
  terrain: TerrainType;
  characterId: string | null;
  isHighlighted: boolean;
  highlightType?: 'valid' | 'invalid' | 'effect' | 'combo';
}

export interface ActionQueueItem {
  id: string;
  characterId: string;
  skillId: string;
  targetPosition: GridCoord | null;
  order: number;
}

export interface BattleEvent {
  id: string;
  timestamp: number;
  type: 'action' | 'damage' | 'heal' | 'status' | 'combo' | 'system';
  message: string;
  data?: Record<string, unknown>;
}

export interface FloatingText {
  id: string;
  position: GridCoord;
  value: number;
  type: 'damage' | 'heal' | 'combo_damage';
  createdAt: number;
}

export interface BattleState {
  turn: number;
  phase: 'deploy' | 'planning' | 'executing' | 'result';
  grid: GridCell[][];
  characters: Character[];
  actionQueue: ActionQueueItem[];
  comboRules: ComboRule[];
  lastComboElements: ElementType[];
  eventLog: BattleEvent[];
  floatingTexts: FloatingText[];
  selectedCharacterId: string | null;
  selectedSkillId: string | null;
  executingActionIndex: number;
  isExecuting: boolean;
}

export interface DeployCharacterPayload {
  characterId: string;
  position: GridCoord;
}

export interface AddActionPayload {
  characterId: string;
  skillId: string;
  targetPosition: GridCoord | null;
}

export interface ReorderActionPayload {
  actionId: string;
  newOrder: number;
}

export interface SkillExecutionResult {
  newState: BattleState;
  events: BattleEvent[];
}
