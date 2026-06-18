export type TrapType = 'electric' | 'poison' | 'fire' | 'ice';

export type ToolMode = 'trap' | 'path' | 'none';

export type GamePhase = 'editing' | 'simulating' | 'ended';

export interface GameTile {
  x: number;
  y: number;
}

export interface Trap {
  id: string;
  type: TrapType;
  x: number;
  y: number;
  triggerDelay: number;
  duration: number;
  remainingDuration: number;
  isTriggered: boolean;
  placedTurn: number;
  triggeredEnemies: Set<string>;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  displayX: number;
  displayY: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  pathIndex: number;
  isStunned: boolean;
  stunEndTime: number;
  isDead: boolean;
}

export interface LogEntry {
  id: string;
  turn: number;
  message: string;
  type: 'info' | 'damage' | 'trap' | 'system';
  timestamp: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface ActiveEffect {
  id: string;
  type: TrapType;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface GameState {
  phase: GamePhase;
  currentTurn: number;
  selectedTool: ToolMode;
  selectedTrapType: TrapType | null;
  editingTrapId: string | null;
  traps: Trap[];
  enemies: Enemy[];
  logs: LogEntry[];
  path: PathPoint[];
  activeEffects: ActiveEffect[];
  gridSize: number;
  tileSize: number;
}

export const TRAP_CONFIG: Record<TrapType, { color: string; damage: number; icon: string; name: string }> = {
  electric: { color: '#facc15', damage: 25, icon: '⚡', name: '电击陷阱' },
  poison: { color: '#22c55e', damage: 15, icon: '☠', name: '毒雾陷阱' },
  fire: { color: '#ef4444', damage: 30, icon: '🔥', name: '火焰陷阱' },
  ice: { color: '#3b82f6', damage: 20, icon: '❄', name: '冰冻陷阱' },
};
