import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type TowerType = 'fire' | 'ice' | 'lightning';

export interface Tower {
  id: string;
  type: TowerType;
  level: number;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  attack: number;
  range: number;
  lastAttackTime: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  pathIndex: number;
  burnTime: number;
  burnDamage: number;
  slowTime: number;
  slowFactor: number;
  reachedEnd: boolean;
  color: string;
}

export interface Hero {
  x: number;
  y: number;
  charging: boolean;
  chargeTime: number;
  cooldown: number;
  skillWaves: SkillWave[];
}

export interface SkillWave {
  id: string;
  x: number;
  y: number;
  radius: number;
  createdAt: number;
}

export interface GameState {
  gold: number;
  wave: number;
  lives: number;
  towers: Tower[];
  enemies: Enemy[];
  hero: Hero;
  placingTower: TowerType | null;
  selectedTowerId: string | null;
  gameOver: boolean;
  killCount: number;
  survivedWaves: number;
  nextWaveTimer: number;
  keys: Set<string>;

  setPlacingTower: (type: TowerType | null) => void;
  placeTower: (gridX: number, gridY: number, cellSize: number, offsetX: number, offsetY: number) => void;
  selectTower: (id: string | null) => void;
  upgradeTower: (id: string) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (id: string) => void;
  updateEnemies: (updater: (enemies: Enemy[]) => Enemy[]) => void;
  setHeroPosition: (x: number, y: number) => void;
  setHeroCharging: (charging: boolean) => void;
  setHeroChargeTime: (time: number) => void;
  setHeroCooldown: (cooldown: number) => void;
  addSkillWave: (x: number, y: number, radius: number) => void;
  removeSkillWave: (id: string) => void;
  damageEnemy: (id: string, damage: number, effects?: { burn?: boolean; slow?: boolean; chain?: boolean }) => void;
  addGold: (amount: number) => void;
  loseLife: (amount: number) => void;
  setWave: (wave: number) => void;
  setNextWaveTimer: (timer: number) => void;
  incrementKillCount: () => void;
  setSurvivedWaves: (waves: number) => void;
  markEnemyReachedEnd: (id: string) => void;
  setKey: (key: string, pressed: boolean) => void;
  resetGame: () => void;
}

export const TOWER_CONFIG: Record<TowerType, { attack: number; range: number; name: string }> = {
  fire: { attack: 15, range: 100, name: '火塔' },
  ice: { attack: 10, range: 120, name: '冰塔' },
  lightning: { attack: 25, range: 110, name: '雷塔' },
};

export const TOWER_PRICES: Record<TowerType, number> = {
  fire: 80,
  ice: 100,
  lightning: 120,
};

export const UPGRADE_PRICES = [0, 60, 120];

const GRID_SIZE = 10;
const CELL_SIZE = 60;
const INITIAL_HERO_X = 230;
const INITIAL_HERO_Y = 80;

const initialState = {
  gold: 200,
  wave: 0,
  lives: 100,
  towers: [] as Tower[],
  enemies: [] as Enemy[],
  hero: {
    x: INITIAL_HERO_X,
    y: INITIAL_HERO_Y,
    charging: false,
    chargeTime: 0,
    cooldown: 0,
    skillWaves: [],
  },
  placingTower: null as TowerType | null,
  selectedTowerId: null as string | null,
  gameOver: false,
  killCount: 0,
  survivedWaves: 0,
  nextWaveTimer: 15,
  keys: new Set<string>(),
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,

  setPlacingTower: (type) => set({ placingTower: type, selectedTowerId: null }),

  placeTower: (gridX, gridY, cellSize, offsetX, offsetY) => {
    const state = get();
    if (!state.placingTower) return;
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) return;

    const occupied = state.towers.some(t => t.gridX === gridX && t.gridY === gridY);
    if (occupied) return;

    const price = TOWER_PRICES[state.placingTower];
    if (state.gold < price) return;

    const config = TOWER_CONFIG[state.placingTower];
    const tower: Tower = {
      id: uuidv4(),
      type: state.placingTower,
      level: 1,
      gridX,
      gridY,
      x: offsetX + gridX * cellSize + cellSize / 2,
      y: offsetY + gridY * cellSize + cellSize / 2,
      attack: config.attack,
      range: config.range,
      lastAttackTime: 0,
    };

    set({
      towers: [...state.towers, tower],
      gold: state.gold - price,
      placingTower: null,
    });
  },

  selectTower: (id) => set({ selectedTowerId: id, placingTower: null }),

  upgradeTower: (id) => {
    const state = get();
    const tower = state.towers.find(t => t.id === id);
    if (!tower || tower.level >= 3) return;

    const price = UPGRADE_PRICES[tower.level];
    if (state.gold < price) return;

    const updatedTowers = state.towers.map(t => {
      if (t.id !== id) return t;
      return {
        ...t,
        level: t.level + 1,
        attack: Math.floor(t.attack * 1.5),
        range: Math.floor(t.range * 1.2),
      };
    });

    set({
      towers: updatedTowers,
      gold: state.gold - price,
    });
  },

  addEnemy: (enemy) => set(state => ({ enemies: [...state.enemies, enemy] })),

  removeEnemy: (id) => set(state => ({ enemies: state.enemies.filter(e => e.id !== id) })),

  updateEnemies: (updater) => set(state => ({ enemies: updater(state.enemies) })),

  setHeroPosition: (x, y) => set(state => ({ hero: { ...state.hero, x, y } })),

  setHeroCharging: (charging) => set(state => ({ hero: { ...state.hero, charging } })),

  setHeroChargeTime: (time) => set(state => ({ hero: { ...state.hero, chargeTime: time } })),

  setHeroCooldown: (cooldown) => set(state => ({ hero: { ...state.hero, cooldown } })),

  addSkillWave: (x, y, radius) => {
    const wave: SkillWave = {
      id: uuidv4(),
      x,
      y,
      radius,
      createdAt: Date.now(),
    };
    set(state => ({ hero: { ...state.hero, skillWaves: [...state.hero.skillWaves, wave] } }));
  },

  removeSkillWave: (id) => set(state => ({
    hero: { ...state.hero, skillWaves: state.hero.skillWaves.filter(w => w.id !== id) },
  })),

  damageEnemy: (id, damage, effects) => {
    const state = get();
    let killed = false;

    const updated = state.enemies.map(e => {
      if (e.id !== id) return e;
      const newHp = e.hp - damage;
      if (newHp <= 0) {
        killed = true;
        return { ...e, hp: 0 };
      }
      return {
        ...e,
        hp: newHp,
        burnTime: effects?.burn ? 3 : e.burnTime,
        burnDamage: effects?.burn ? 5 : e.burnDamage,
        slowTime: effects?.slow ? 2 : e.slowTime,
        slowFactor: effects?.slow ? 0.5 : e.slowFactor,
      };
    });

    if (killed) {
      set(state => ({
        enemies: updated.filter(e => e.hp > 0),
        killCount: state.killCount + 1,
        gold: state.gold + 20,
      }));
    } else {
      set({ enemies: updated });
    }
  },

  addGold: (amount) => set(state => ({ gold: state.gold + amount })),

  loseLife: (amount) => {
    const state = get();
    const newLives = Math.max(0, state.lives - amount);
    set({
      lives: newLives,
      gameOver: newLives <= 0,
      survivedWaves: newLives <= 0 ? state.survivedWaves : state.survivedWaves,
    });
  },

  setWave: (wave) => set({ wave }),

  setNextWaveTimer: (timer) => set({ nextWaveTimer: timer }),

  incrementKillCount: () => set(state => ({ killCount: state.killCount + 1 })),

  setSurvivedWaves: (waves) => set({ survivedWaves: waves }),

  markEnemyReachedEnd: (id) => {
    const state = get();
    const newLives = Math.max(0, state.lives - 10);
    set({
      enemies: state.enemies.filter(e => e.id !== id),
      lives: newLives,
      gameOver: newLives <= 0,
    });
  },

  setKey: (key, pressed) => {
    set(state => {
      const newKeys = new Set(state.keys);
      if (pressed) {
        newKeys.add(key.toLowerCase());
      } else {
        newKeys.delete(key.toLowerCase());
      }
      return { keys: newKeys };
    });
  },

  resetGame: () => set({
    ...initialState,
    keys: new Set<string>(),
    hero: { ...initialState.hero, skillWaves: [] },
  }),
}));

export { GRID_SIZE, CELL_SIZE, INITIAL_HERO_X, INITIAL_HERO_Y };
