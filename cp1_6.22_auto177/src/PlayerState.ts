import { create } from 'zustand';
import {
  Plant, Enemy, Projectile, Particle, UpgradeParticle, GamePhase,
  GRID_COLS, GRID_ROWS, INITIAL_SUNLIGHT, PLANT_LEVELS,
} from './types';

let _nextId = 0;
export function genId(): string {
  return `e${++_nextId}`;
}

export interface GameState {
  plants: Plant[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  upgradeParticles: UpgradeParticle[];
  sunlight: number;
  wave: number;
  leaks: number;
  kills: number;
  phase: GamePhase;
  selectedCard: 'plant' | null;
  lastSunlightTime: number;
  waveStartTime: number;
  waveEnemiesSpawned: number;
  waveEnemiesTotal: number;
  score: number;
  waveTransitionStart: number;
  lastFrameTime: number;
  cellSize: number;
}

export interface GameActions {
  startGame: () => void;
  selectCard: (card: 'plant' | null) => void;
  placePlant: (gridX: number, gridY: number) => boolean;
  upgradePlant: (plantId: string) => boolean;
  setCellSize: (size: number) => void;
  updateState: (partial: Partial<GameState>) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  addProjectile: (proj: Projectile) => void;
  removeProjectile: (id: string) => void;
  addParticles: (particles: Particle[]) => void;
  addUpgradeParticles: (particles: UpgradeParticle[]) => void;
  damageEnemy: (id: string, damage: number) => void;
  addSunlight: (amount: number) => void;
  addKill: () => void;
  addLeak: () => void;
  moveEnemy: (id: string, x: number) => void;
  setEnemyFlash: (id: string, time: number) => void;
  setEnemyShield: (id: string, active: boolean) => void;
  setEnemyDead: (id: string, time: number) => void;
  setEnemyOpacity: (id: string, opacity: number) => void;
  nextWave: () => void;
  setPhase: (phase: GamePhase) => void;
  cleanupEntities: () => void;
  reset: () => void;
}

const initialState: GameState = {
  plants: [],
  enemies: [],
  projectiles: [],
  particles: [],
  upgradeParticles: [],
  sunlight: INITIAL_SUNLIGHT,
  wave: 0,
  leaks: 0,
  kills: 0,
  phase: 'idle',
  selectedCard: null,
  lastSunlightTime: 0,
  waveStartTime: 0,
  waveEnemiesSpawned: 0,
  waveEnemiesTotal: 0,
  score: 0,
  waveTransitionStart: 0,
  lastFrameTime: 0,
  cellSize: 40,
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  startGame: () => {
    _nextId = 0;
    set({
      ...initialState,
      phase: 'playing',
      wave: 1,
      lastSunlightTime: performance.now() / 1000,
      waveStartTime: performance.now() / 1000,
      waveEnemiesSpawned: 0,
      waveEnemiesTotal: 0,
      lastFrameTime: performance.now() / 1000,
    });
  },

  selectCard: (card) => set({ selectedCard: card }),

  placePlant: (gridX, gridY) => {
    const state = get();
    if (state.selectedCard !== 'plant') return false;
    if (state.sunlight < PLANT_LEVELS[1].cost) return false;
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) return false;
    const occupied = state.plants.some(p => p.gridX === gridX && p.gridY === gridY);
    if (occupied) return false;

    const config = PLANT_LEVELS[1];
    const plant: Plant = {
      id: genId(),
      gridX,
      gridY,
      level: 1,
      attackPower: config.attackPower,
      range: config.range,
      attackSpeed: config.attackSpeed,
      lastAttackTime: 0,
      upgrading: false,
      upgradeStartTime: 0,
    };
    set(s => ({
      plants: [...s.plants, plant],
      sunlight: s.sunlight - config.cost,
      selectedCard: null,
    }));
    return true;
  },

  upgradePlant: (plantId) => {
    const state = get();
    const plant = state.plants.find(p => p.id === plantId);
    if (!plant) return false;
    if (plant.level >= 3) return false;
    const nextLevel = (plant.level + 1) as 1 | 2 | 3;
    const cost = PLANT_LEVELS[nextLevel].cost;
    if (state.sunlight < cost) return false;

    const config = PLANT_LEVELS[nextLevel];
    set(s => ({
      plants: s.plants.map(p =>
        p.id === plantId
          ? { ...p, level: nextLevel, attackPower: config.attackPower, range: config.range, attackSpeed: config.attackSpeed, upgrading: true, upgradeStartTime: performance.now() / 1000 }
          : p
      ),
      sunlight: s.sunlight - cost,
    }));
    return true;
  },

  setCellSize: (size) => set({ cellSize: size }),

  updateState: (partial) => set(partial as Partial<GameState>),

  addEnemy: (enemy) => set(s => ({ enemies: [...s.enemies, enemy] })),

  removeEnemy: (id) => set(s => ({ enemies: s.enemies.filter(e => e.id !== id) })),

  addProjectile: (proj) => set(s => ({ projectiles: [...s.projectiles, proj] })),

  removeProjectile: (id) => set(s => ({ projectiles: s.projectiles.filter(p => p.id !== id) })),

  addParticles: (particles) => set(s => ({ particles: [...s.particles, ...particles] })),

  addUpgradeParticles: (particles) => set(s => ({ upgradeParticles: [...s.upgradeParticles, ...particles] })),

  damageEnemy: (id, damage) => set(s => ({
    enemies: s.enemies.map(e =>
      e.id === id ? { ...e, hp: Math.max(0, e.hp - damage) } : e
    ),
  })),

  addSunlight: (amount) => set(s => ({ sunlight: s.sunlight + amount })),

  addKill: () => set(s => ({ kills: s.kills + 1 })),

  addLeak: () => set(s => ({ leaks: s.leaks + 1 })),

  moveEnemy: (id, x) => set(s => ({
    enemies: s.enemies.map(e => e.id === id ? { ...e, x } : e),
  })),

  setEnemyFlash: (id, time) => set(s => ({
    enemies: s.enemies.map(e => e.id === id ? { ...e, hitFlashTime: time } : e),
  })),

  setEnemyShield: (id, active) => set(s => ({
    enemies: s.enemies.map(e => e.id === id ? { ...e, shieldActive: active, lastShieldTime: active ? performance.now() / 1000 : e.lastShieldTime } : e),
  })),

  setEnemyDead: (id, time) => set(s => ({
    enemies: s.enemies.map(e => e.id === id ? { ...e, dead: true, deathTime: time } : e),
  })),

  setEnemyOpacity: (id, opacity) => set(s => ({
    enemies: s.enemies.map(e => e.id === id ? { ...e, opacity } : e),
  })),

  nextWave: () => {
    const state = get();
    const nextW = state.wave + 1;
    if (nextW > 5) {
      set({ phase: 'victory' });
    } else {
      set({
        wave: nextW,
        phase: 'waveTransition',
        waveTransitionStart: performance.now() / 1000,
        waveEnemiesSpawned: 0,
        waveEnemiesTotal: 0,
      });
    }
  },

  setPhase: (phase) => set({ phase }),

  cleanupEntities: () => set(s => ({
    enemies: s.enemies.filter(e => !e.dead || (performance.now() / 1000 - e.deathTime < 0.5)),
    projectiles: s.projectiles.filter(p => !p.hit),
    particles: s.particles.filter(p => (performance.now() / 1000 - p.createdAt) < p.duration),
    upgradeParticles: s.upgradeParticles.filter(p => (performance.now() / 1000 - p.createdAt) < p.duration),
    plants: s.plants.map(p => {
      if (p.upgrading && (performance.now() / 1000 - p.upgradeStartTime) > 0.6) {
        return { ...p, upgrading: false };
      }
      return p;
    }),
  })),

  reset: () => {
    _nextId = 0;
    set({ ...initialState, cellSize: get().cellSize });
  },
}));
