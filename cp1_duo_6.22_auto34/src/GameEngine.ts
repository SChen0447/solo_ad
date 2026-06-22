export type Side = 'attacker' | 'defender';
export type UnitType = 'infantry' | 'archer' | 'catapult' | 'knight' | 'trebuchet';
export type ActionType = 'move' | 'attack' | 'deploy';
export type CellKind = 'ground' | 'wall' | 'gate' | 'attackerZone' | 'defenderZone';

export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  side: Side;
  position: Position;
  hp: number;
  maxHp: number;
  attack: number;
  range: number;
  movedThisTurn: boolean;
  attackedThisTurn: boolean;
  justDeployed: boolean;
}

export interface BattleLog {
  id: number;
  turn: number;
  timestamp: number;
  unitName: string;
  side: Side;
  actionType: ActionType;
  targetName?: string;
  damage?: number;
  from?: Position;
  to?: Position;
}

export interface Projectile {
  id: number;
  from: Position;
  to: Position;
  progress: number;
  duration: number;
}

export interface HitAnimation {
  position: Position;
  startTime: number;
}

export interface DeployAnimation {
  unitId: string;
  startTime: number;
  fromEdge: 'left' | 'right';
}

export interface GameState {
  gridRows: number;
  gridCols: number;
  wallRows: number[];
  gateHp: number;
  gateMaxHp: number;
  turn: number;
  maxTurns: number;
  currentSide: Side;
  phase: 'deploy' | 'battle' | 'ended';
  units: Unit[];
  selectedUnitId: string | null;
  logs: BattleLog[];
  winner: Side | 'draw' | null;
  winReason: string | null;
  projectiles: Projectile[];
  hitAnimations: HitAnimation[];
  deployAnimations: DeployAnimation[];
  attackerMorale: number;
  defenderMorale: number;
}

export const GRID_ROWS = 10;
export const GRID_COLS = 12;
export const WALL_ROWS = [4, 5];
export const GATE_POSITIONS: Position[] = [
  { x: 5, y: 4 },
  { x: 5, y: 5 },
  { x: 6, y: 4 },
  { x: 6, y: 5 },
];
export const GATE_MAX_HP = 500;
export const MAX_TURNS = 15;

export const UNIT_CONFIGS: Record<UnitType, {
  name: string;
  hp: number;
  attack: number;
  range: number;
  icon: string;
  allowedSide: Side | 'both';
}> = {
  infantry: { name: '步兵', hp: 80, attack: 20, range: 1, icon: '⚔️', allowedSide: 'attacker' },
  archer: { name: '弓箭手', hp: 50, attack: 15, range: 3, icon: '🏹', allowedSide: 'both' },
  catapult: { name: '投石车', hp: 60, attack: 40, range: 5, icon: '🪨', allowedSide: 'attacker' },
  knight: { name: '骑士', hp: 120, attack: 25, range: 1, icon: '🛡️', allowedSide: 'defender' },
  trebuchet: { name: '投石机', hp: 70, attack: 50, range: 5, icon: '💥', allowedSide: 'defender' },
};

let unitIdCounter = 1;
let logIdCounter = 1;
let projectileIdCounter = 1;

function nextUnitId(): string {
  return `u_${unitIdCounter++}`;
}

function nextLogId(): number {
  return logIdCounter++;
}

function nextProjectileId(): number {
  return projectileIdCounter++;
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getCellKind(x: number, y: number): CellKind {
  if (WALL_ROWS.includes(y)) {
    const isGate = GATE_POSITIONS.some(p => p.x === x && p.y === y);
    return isGate ? 'gate' : 'wall';
  }
  if (x < 3) return 'attackerZone';
  if (x >= GRID_COLS - 3) return 'defenderZone';
  return 'ground';
}

export function isPassable(x: number, y: number, units: Unit[]): boolean {
  if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return false;
  const kind = getCellKind(x, y);
  if (kind === 'wall') return false;
  if (units.some(u => u.hp > 0 && u.position.x === x && u.position.y === y)) return false;
  return true;
}

export function createInitialState(): GameState {
  unitIdCounter = 1;
  logIdCounter = 1;
  projectileIdCounter = 1;
  return {
    gridRows: GRID_ROWS,
    gridCols: GRID_COLS,
    wallRows: [...WALL_ROWS],
    gateHp: GATE_MAX_HP,
    gateMaxHp: GATE_MAX_HP,
    turn: 1,
    maxTurns: MAX_TURNS,
    currentSide: 'attacker',
    phase: 'battle',
    units: createInitialUnits(),
    selectedUnitId: null,
    logs: [createInitialLog()],
    winner: null,
    winReason: null,
    projectiles: [],
    hitAnimations: [],
    deployAnimations: [],
    attackerMorale: 100,
    defenderMorale: 100,
  };
}

function createInitialUnits(): Unit[] {
  const units: Unit[] = [];
  const now = Date.now();

  const attackerPlacements: { type: UnitType; x: number; y: number }[] = [
    { type: 'infantry', x: 0, y: 1 },
    { type: 'infantry', x: 0, y: 3 },
    { type: 'infantry', x: 0, y: 6 },
    { type: 'infantry', x: 0, y: 8 },
    { type: 'archer', x: 1, y: 2 },
    { type: 'archer', x: 1, y: 7 },
    { type: 'catapult', x: 2, y: 4 },
    { type: 'catapult', x: 2, y: 5 },
  ];

  attackerPlacements.forEach(p => {
    const cfg = UNIT_CONFIGS[p.type];
    units.push({
      id: nextUnitId(),
      type: p.type,
      side: 'attacker',
      position: { x: p.x, y: p.y },
      hp: cfg.hp,
      maxHp: cfg.hp,
      attack: cfg.attack,
      range: cfg.range,
      movedThisTurn: false,
      attackedThisTurn: false,
      justDeployed: false,
    });
  });

  const defenderPlacements: { type: UnitType; x: number; y: number }[] = [
    { type: 'knight', x: 11, y: 1 },
    { type: 'knight', x: 11, y: 8 },
    { type: 'archer', x: 10, y: 3 },
    { type: 'archer', x: 10, y: 6 },
    { type: 'archer', x: 9, y: 2 },
    { type: 'archer', x: 9, y: 7 },
    { type: 'trebuchet', x: 11, y: 3 },
    { type: 'trebuchet', x: 11, y: 6 },
  ];

  defenderPlacements.forEach(p => {
    const cfg = UNIT_CONFIGS[p.type];
    units.push({
      id: nextUnitId(),
      type: p.type,
      side: 'defender',
      position: { x: p.x, y: p.y },
      hp: cfg.hp,
      maxHp: cfg.hp,
      attack: cfg.attack,
      range: cfg.range,
      movedThisTurn: false,
      attackedThisTurn: false,
      justDeployed: false,
    });
  });

  return units;
}

function createInitialLog(): BattleLog {
  return {
    id: nextLogId(),
    turn: 1,
    timestamp: Date.now(),
    unitName: '系统',
    side: 'attacker',
    actionType: 'deploy',
    from: undefined,
    to: undefined,
  };
}

function addLog(
  state: GameState,
  log: Omit<BattleLog, 'id' | 'turn' | 'timestamp'>
): void {
  state.logs.unshift({
    ...log,
    id: nextLogId(),
    turn: state.turn,
    timestamp: Date.now(),
  });
  if (state.logs.length > 50) {
    state.logs.pop();
  }
}

export function getUnitAt(state: GameState, x: number, y: number): Unit | null {
  return state.units.find(u => u.hp > 0 && u.position.x === x && u.position.y === y) || null;
}

export function selectUnit(state: GameState, unitId: string | null): GameState {
  const newState = { ...state };
  newState.selectedUnitId = unitId;
  return newState;
}

export function tryMoveUnit(state: GameState, unitId: string, toX: number, toY: number): GameState {
  const newState = cloneState(state);
  const unit = newState.units.find(u => u.id === unitId);
  if (!unit || unit.hp <= 0) return state;
  if (unit.side !== newState.currentSide) return state;
  if (unit.movedThisTurn) return state;

  const dist = manhattanDistance(unit.position, { x: toX, y: toY });
  if (dist !== 1) return state;

  if (!isPassable(toX, toY, newState.units.filter(u => u.id !== unitId))) return state;

  const fromPos = { ...unit.position };
  unit.position = { x: toX, y: toY };
  unit.movedThisTurn = true;

  addLog(newState, {
    unitName: UNIT_CONFIGS[unit.type].name,
    side: unit.side,
    actionType: 'move',
    from: fromPos,
    to: { x: toX, y: toY },
  });

  return newState;
}

export function tryAttackUnit(
  state: GameState,
  attackerUnitId: string,
  targetX: number,
  targetY: number
): GameState {
  const newState = cloneState(state);
  const attacker = newState.units.find(u => u.id === attackerUnitId);
  if (!attacker || attacker.hp <= 0) return state;
  if (attacker.side !== newState.currentSide) return state;
  if (attacker.attackedThisTurn) return state;

  const isGateTarget = GATE_POSITIONS.some(p => p.x === targetX && p.y === targetY);
  const targetUnit = newState.units.find(
    u => u.hp > 0 && u.position.x === targetX && u.position.y === targetY
  );

  if (!isGateTarget && !targetUnit) return state;
  if (targetUnit && targetUnit.side === attacker.side) return state;

  const dist = manhattanDistance(attacker.position, { x: targetX, y: targetY });
  if (dist > attacker.range || dist === 0) return state;

  const damage = calculateDamage(attacker.attack, dist, attacker.range);

  newState.projectiles.push({
    id: nextProjectileId(),
    from: { ...attacker.position },
    to: { x: targetX, y: targetY },
    progress: 0,
    duration: attacker.range >= 4 ? 500 : 300,
  });

  newState.hitAnimations.push({
    position: { x: targetX, y: targetY },
    startTime: Date.now() + (attacker.range >= 4 ? 500 : 300),
  });

  if (isGateTarget) {
    newState.gateHp = Math.max(0, newState.gateHp - damage);
    addLog(newState, {
      unitName: UNIT_CONFIGS[attacker.type].name,
      side: attacker.side,
      actionType: 'attack',
      targetName: '城门',
      damage,
    });
  } else if (targetUnit) {
    targetUnit.hp = Math.max(0, targetUnit.hp - damage);
    addLog(newState, {
      unitName: UNIT_CONFIGS[attacker.type].name,
      side: attacker.side,
      actionType: 'attack',
      targetName: UNIT_CONFIGS[targetUnit.type].name,
      damage,
    });
    if (targetUnit.hp <= 0) {
      addLog(newState, {
        unitName: UNIT_CONFIGS[targetUnit.type].name,
        side: targetUnit.side,
        actionType: 'attack',
        damage: 0,
      });
    }
  }

  attacker.attackedThisTurn = true;
  updateMorale(newState);
  checkWinCondition(newState);

  return newState;
}

function calculateDamage(baseAttack: number, distance: number, maxRange: number): number {
  const variance = 0.85 + Math.random() * 0.3;
  let multiplier = 1;
  if (maxRange >= 4) {
    multiplier = distance <= 2 ? 0.7 : 1;
  }
  return Math.round(baseAttack * variance * multiplier);
}

function updateMorale(state: GameState): void {
  const attackerUnits = state.units.filter(u => u.side === 'attacker' && u.hp > 0);
  const defenderUnits = state.units.filter(u => u.side === 'defender' && u.hp > 0);
  const attackerInitial = 8;
  const defenderInitial = 8;
  state.attackerMorale = Math.max(0, Math.round((attackerUnits.length / attackerInitial) * 100));
  state.defenderMorale = Math.max(0, Math.round((defenderUnits.length / defenderInitial) * 100));
}

function checkWinCondition(state: GameState): void {
  if (state.gateHp <= 0) {
    state.winner = 'attacker';
    state.winReason = '攻方击破城门，大获全胜！';
    state.phase = 'ended';
    return;
  }
  const attackerUnits = state.units.filter(u => u.side === 'attacker' && u.hp > 0);
  if (attackerUnits.length === 0 || attackerUnits.length < 3) {
    if (state.turn >= 15 || attackerUnits.length === 0) {
      state.winner = 'defender';
      state.winReason = '守方击退来犯之敌，城堡屹立不倒！';
      state.phase = 'ended';
      return;
    }
  }
  if (state.turn > state.maxTurns) {
    state.winner = 'defender';
    state.winReason = '回合耗尽，守方成功守卫城堡！';
    state.phase = 'ended';
  }
}

export function endTurn(state: GameState): GameState {
  const newState = cloneState(state);
  if (newState.phase === 'ended') return state;

  if (newState.currentSide === 'attacker') {
    newState.currentSide = 'defender';
  } else {
    newState.currentSide = 'attacker';
    newState.turn += 1;
    newState.units.forEach(u => {
      u.movedThisTurn = false;
      u.attackedThisTurn = false;
    });
  }

  addLog(newState, {
    unitName: '系统',
    side: newState.currentSide,
    actionType: 'deploy',
  });

  updateMorale(newState);
  checkWinCondition(newState);
  newState.selectedUnitId = null;

  return newState;
}

export function getMovableTiles(state: GameState, unitId: string): Position[] {
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || unit.hp <= 0) return [];
  if (unit.side !== state.currentSide) return [];
  if (unit.movedThisTurn) return [];

  const positions: Position[] = [];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  for (const d of dirs) {
    const nx = unit.position.x + d.dx;
    const ny = unit.position.y + d.dy;
    if (isPassable(nx, ny, state.units.filter(u => u.id !== unitId))) {
      positions.push({ x: nx, y: ny });
    }
  }
  return positions;
}

export function getAttackableTiles(state: GameState, unitId: string): Position[] {
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || unit.hp <= 0) return [];
  if (unit.side !== state.currentSide) return [];
  if (unit.attackedThisTurn) return [];

  const positions: Position[] = [];
  for (let y = 0; y < state.gridRows; y++) {
    for (let x = 0; x < state.gridCols; x++) {
      const dist = manhattanDistance(unit.position, { x, y });
      if (dist === 0 || dist > unit.range) continue;
      const targetUnit = state.units.find(
        u => u.hp > 0 && u.position.x === x && u.position.y === y
      );
      if (targetUnit && targetUnit.side !== unit.side) {
        positions.push({ x, y });
        continue;
      }
      const isGate = GATE_POSITIONS.some(p => p.x === x && p.y === y);
      if (isGate && unit.side === 'attacker') {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    units: state.units.map(u => ({ ...u, position: { ...u.position } })),
    logs: [...state.logs],
    projectiles: state.projectiles.map(p => ({
      ...p,
      from: { ...p.from },
      to: { ...p.to },
    })),
    hitAnimations: state.hitAnimations.map(h => ({
      ...h,
      position: { ...h.position },
    })),
    deployAnimations: state.deployAnimations.map(d => ({ ...d })),
    wallRows: [...state.wallRows],
  };
}

export function updateAnimations(state: GameState, deltaMs: number): GameState {
  const newState = cloneState(state);
  const now = Date.now();

  newState.projectiles = newState.projectiles.filter(p => {
    p.progress += (deltaMs / p.duration) * 100;
    return p.progress < 100;
  });

  newState.hitAnimations = newState.hitAnimations.filter(h => now - h.startTime < 300);
  newState.deployAnimations = newState.deployAnimations.filter(d => now - d.startTime < 300);

  return newState;
}
