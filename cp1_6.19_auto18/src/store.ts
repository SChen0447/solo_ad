import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameState,
  TrapType,
  Trap,
  Enemy,
  LogEntry,
  PathPoint,
  ActiveEffect,
  GamePhase,
  ToolMode,
} from './types';
import { TRAP_CONFIG } from './types';

const GRID_SIZE = 16;
const TILE_SIZE = 40;

const generateDefaultPath = (): PathPoint[] => {
  const path: PathPoint[] = [];
  for (let i = 0; i <= 15; i++) {
    path.push({ x: i, y: 0 });
  }
  for (let i = 1; i <= 15; i++) {
    path.push({ x: 15, y: i });
  }
  return path;
};

interface GameActions {
  setSelectedTool: (tool: ToolMode) => void;
  setSelectedTrapType: (type: TrapType | null) => void;
  placeTrap: (x: number, y: number) => void;
  removeTrap: (id: string) => void;
  setEditingTrapId: (id: string | null) => void;
  updateTrapParams: (id: string, triggerDelay: number, duration: number) => void;
  togglePathPoint: (x: number, y: number) => void;
  clearPath: () => void;
  resetPath: () => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  addEnemy: (enemy: Enemy) => void;
  updateEnemy: (id: string, updates: Partial<Enemy>) => void;
  removeEnemy: (id: string) => void;
  incrementTurn: () => void;
  addLog: (message: string, type: LogEntry['type']) => void;
  triggerTrap: (trapId: string) => void;
  updateTrapRemaining: (trapId: string, remaining: number) => void;
  addActiveEffect: (effect: Omit<ActiveEffect, 'id' | 'startTime'>) => void;
  removeActiveEffect: (id: string) => void;
  clearExpiredEffects: (now: number) => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  phase: 'editing',
  currentTurn: 0,
  selectedTool: 'trap',
  selectedTrapType: null,
  editingTrapId: null,
  traps: [],
  enemies: [],
  logs: [],
  path: generateDefaultPath(),
  activeEffects: [],
  gridSize: GRID_SIZE,
  tileSize: TILE_SIZE,

  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedTrapType: (type) => set({ selectedTrapType: type }),

  placeTrap: (x, y) => {
    const { selectedTrapType, traps, phase } = get();
    if (!selectedTrapType || phase !== 'editing') return;
    const exists = traps.find((t) => t.x === x && t.y === y);
    if (exists) return;
    const newTrap: Trap = {
      id: uuidv4(),
      type: selectedTrapType,
      x,
      y,
      triggerDelay: 0,
      duration: 2,
      remainingDuration: 2,
      isTriggered: false,
      placedTurn: 0,
      triggeredEnemies: new Set(),
    };
    set({ traps: [...traps, newTrap] });
  },

  removeTrap: (id) => {
    const { traps, phase } = get();
    if (phase !== 'editing') return;
    set({
      traps: traps.filter((t) => t.id !== id),
      editingTrapId: get().editingTrapId === id ? null : get().editingTrapId,
    });
  },

  setEditingTrapId: (id) => set({ editingTrapId: id }),

  updateTrapParams: (id, triggerDelay, duration) => {
    set({
      traps: get().traps.map((t) =>
        t.id === id
          ? { ...t, triggerDelay, duration, remainingDuration: duration }
          : t
      ),
      editingTrapId: null,
    });
  },

  togglePathPoint: (x, y) => {
    const { path, phase } = get();
    if (phase !== 'editing') return;
    const idx = path.findIndex((p) => p.x === x && p.y === y);
    if (idx >= 0) {
      set({ path: path.slice(0, idx) });
    } else {
      set({ path: [...path, { x, y }] });
    }
  },

  clearPath: () => set({ path: [] }),
  resetPath: () => set({ path: generateDefaultPath() }),

  startSimulation: () => {
    const { path, addLog } = get();
    if (path.length < 2) {
      addLog('路径点数不足，至少需要2个点', 'system');
      return;
    }
    const startPoint = path[0];
    const newEnemy: Enemy = {
      id: uuidv4(),
      x: startPoint.x,
      y: startPoint.y,
      displayX: startPoint.x,
      displayY: startPoint.y,
      targetX: startPoint.x,
      targetY: startPoint.y,
      health: 100,
      maxHealth: 100,
      pathIndex: 0,
      isStunned: false,
      stunEndTime: 0,
      isDead: false,
    };
    set({
      phase: 'simulating',
      currentTurn: 0,
      enemies: [newEnemy],
      activeEffects: [],
      traps: get().traps.map((t) => ({
        ...t,
        isTriggered: false,
        remainingDuration: t.duration,
        triggeredEnemies: new Set(),
        placedTurn: 0,
      })),
    });
    get().addLog('模拟启动，敌人 #01 已部署', 'system');
  },

  stopSimulation: () => {
    set({ phase: 'ended' });
    get().addLog('模拟已停止', 'system');
  },

  resetSimulation: () => {
    set({
      phase: 'editing',
      currentTurn: 0,
      enemies: [],
      activeEffects: [],
      logs: [],
      traps: get().traps.map((t) => ({
        ...t,
        isTriggered: false,
        remainingDuration: t.duration,
        triggeredEnemies: new Set(),
      })),
    });
  },

  addEnemy: (enemy) => set({ enemies: [...get().enemies, enemy] }),

  updateEnemy: (id, updates) => {
    set({
      enemies: get().enemies.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  },

  removeEnemy: (id) => {
    set({ enemies: get().enemies.filter((e) => e.id !== id) });
  },

  incrementTurn: () => {
    set({ currentTurn: get().currentTurn + 1 });
  },

  addLog: (message, type) => {
    const { currentTurn, logs } = get();
    const entry: LogEntry = {
      id: uuidv4(),
      turn: currentTurn,
      message,
      type,
      timestamp: Date.now(),
    };
    const newLogs = [entry, ...logs].slice(0, 100);
    set({ logs: newLogs });
  },

  triggerTrap: (trapId) => {
    set({
      traps: get().traps.map((t) =>
        t.id === trapId ? { ...t, isTriggered: true } : t
      ),
    });
  },

  updateTrapRemaining: (trapId, remaining) => {
    set({
      traps: get().traps.map((t) =>
        t.id === trapId ? { ...t, remainingDuration: remaining } : t
      ),
    });
  },

  addActiveEffect: (effect) => {
    const newEffect: ActiveEffect = {
      ...effect,
      id: uuidv4(),
      startTime: Date.now(),
    };
    set({ activeEffects: [...get().activeEffects, newEffect] });
  },

  removeActiveEffect: (id) => {
    set({ activeEffects: get().activeEffects.filter((e) => e.id !== id) });
  },

  clearExpiredEffects: (now) => {
    set({
      activeEffects: get().activeEffects.filter(
        (e) => now - e.startTime < e.duration * 1000
      ),
    });
  },
}));

export { TRAP_CONFIG };
