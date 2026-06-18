import { create } from 'zustand';

export type TowerType = 'arrow' | 'magic' | 'stone';
export type TowerRank = 'D' | 'C' | 'B' | 'A' | 'S';
export type EnemyType = 'infantry' | 'cavalry' | 'batteringRam' | 'catapult';
export type GamePhase = 'preparing' | 'waveActive' | 'waveInterval' | 'gameOver' | 'victory';

export interface Tower {
  id: string;
  type: TowerType;
  rank: TowerRank;
  hexQ: number;
  hexR: number;
  x: number;
  z: number;
  damage: number;
  range: number;
  attackSpeed: number;
  lastAttackTime: number;
  specialEffect?: 'doubleShot' | 'freeze' | 'stun';
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  damage: number;
  goldReward: number;
  pathIndex: number;
  pathId: number;
  x: number;
  z: number;
  slowUntil: number;
  stunUntil: number;
  reachedCastle: boolean;
}

export interface Projectile {
  id: string;
  type: TowerType;
  startX: number;
  startZ: number;
  startY: number;
  targetId: string;
  targetX: number;
  targetZ: number;
  damage: number;
  splashRadius: number;
  speed: number;
  progress: number;
  isAoe: boolean;
  hasSpecial: boolean;
  specialType?: 'doubleShot' | 'freeze' | 'stun';
  createdAt: number;
}

export interface ParticleEffect {
  id: string;
  type: 'dust' | 'explosion' | 'death' | 'buildDust' | 'towerFlow';
  x: number;
  z: number;
  y: number;
  createdAt: number;
  duration: number;
  color?: string;
  linkedTowerId?: string;
}

export interface WaveConfig {
  enemyCount: number;
  infantryRatio: number;
  cavalryRatio: number;
  batteringRamRatio: number;
  catapultRatio: number;
  isRandom: boolean;
}

export interface HexCell {
  q: number;
  r: number;
  x: number;
  z: number;
  isPath: boolean;
  isBuildable: boolean;
  isCastle: boolean;
  isSpawn: boolean;
  pathId?: number;
}

interface GameState {
  gold: number;
  castleHp: number;
  maxCastleHp: number;
  currentWave: number;
  totalWaves: number;
  kills: number;
  phase: GamePhase;
  waveIntervalRemaining: number;
  selectedTowerType: TowerType | null;
  selectedTowerId: string | null;
  buildMode: boolean;
  hoveredHex: { q: number; r: number } | null;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: ParticleEffect[];
  hexGrid: HexCell[];
  paths: { x: number; z: number }[][];
  castleFlash: boolean;
  highScore: {
    waves: number;
    kills: number;
    gold: number;
  };
  waveConfig: WaveConfig;

  setGold: (gold: number) => void;
  addGold: (amount: number) => void;
  deductGold: (amount: number) => boolean;
  setCastleHp: (hp: number) => void;
  damageCastle: (damage: number) => void;
  triggerCastleFlash: () => void;
  setPhase: (phase: GamePhase) => void;
  setCurrentWave: (wave: number) => void;
  addKill: () => void;
  setSelectedTowerType: (type: TowerType | null) => void;
  setBuildMode: (mode: boolean) => void;
  setHoveredHex: (hex: { q: number; r: number } | null) => void;
  selectTower: (id: string | null) => void;
  addTower: (tower: Tower) => void;
  upgradeTower: (towerId: string) => boolean;
  removeTower: (towerId: string) => void;
  updateTowers: (towers: Tower[]) => void;
  setEnemies: (enemies: Enemy[]) => void;
  addEnemies: (enemies: Enemy[]) => void;
  updateEnemies: (enemies: Enemy[]) => void;
  addProjectile: (proj: Projectile) => void;
  removeProjectile: (id: string) => void;
  updateProjectiles: (projs: Projectile[]) => void;
  addParticle: (particle: ParticleEffect) => void;
  removeParticle: (id: string) => void;
  updateParticles: (particles: ParticleEffect[]) => void;
  setWaveIntervalRemaining: (time: number) => void;
  startWave: () => void;
  setWaveConfig: (config: Partial<WaveConfig>) => void;
  loadHighScore: () => void;
  saveHighScore: () => void;
  resetGame: () => void;
  initializeGrid: () => void;
}

const HEX_SIZE = 1.1;
const GRID_RADIUS = 5;

const hexToWorld = (q: number, r: number): { x: number; z: number } => {
  const x = HEX_SIZE * (3 / 2 * q);
  const z = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, z };
};

const generateHexGrid = (): HexCell[] => {
  const cells: HexCell[] = [];
  const pathCells = new Set<string>();
  const pathSets: Set<string>[] = [];
  const pathsPoints: { x: number; z: number }[][] = [];

  const pathRoutes = [
    [
      { q: -5, r: 0 }, { q: -4, r: 0 }, { q: -3, r: 0 },
      { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -1, r: 1 },
      { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 0, r: 1 }, { q: 0, r: 0 }
    ],
    [
      { q: 5, r: -2 }, { q: 4, r: -1 }, { q: 3, r: -1 },
      { q: 3, r: 0 }, { q: 2, r: 0 }, { q: 1, r: 0 },
      { q: 1, r: -1 }, { q: 1, r: -2 }, { q: 0, r: -1 }, { q: 0, r: 0 }
    ],
    [
      { q: 0, r: -5 }, { q: 0, r: -4 }, { q: 0, r: -3 },
      { q: -1, r: -2 }, { q: -1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 0, r: 0 }
    ]
  ];

  pathRoutes.forEach((route, pathId) => {
    const pathSet = new Set<string>();
    route.forEach(c => {
      const key = `${c.q},${c.r}`;
      pathCells.add(key);
      pathSet.add(key);
    });
    pathSets.push(pathSet);

    const points = route.map(c => hexToWorld(c.q, c.r));
    pathsPoints.push(points);
  });

  const spawnKeys = new Set([
    '-5,0', '5,-2', '0,-5'
  ]);

  for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
    for (let r = -GRID_RADIUS; r <= GRID_RADIUS; r++) {
      if (Math.abs(q + r) > GRID_RADIUS) continue;
      const { x, z } = hexToWorld(q, r);
      const key = `${q},${r}`;
      const isCastle = q === 0 && r === 0;
      const isSpawn = spawnKeys.has(key);
      const isPath = pathCells.has(key);
      let pathId: number | undefined;
      if (isPath) {
        for (let i = 0; i < pathSets.length; i++) {
          if (pathSets[i].has(key)) { pathId = i; break; }
        }
      }
      cells.push({
        q, r, x, z,
        isPath: isPath || isCastle || isSpawn,
        isBuildable: !isPath && !isCastle && !isSpawn,
        isCastle,
        isSpawn,
        pathId
      });
    }
  }

  (window as any).__hexGrid = cells;
  (window as any).__paths = pathsPoints;

  return cells;
};

const getInitialPaths = (): { x: number; z: number }[][] => {
  const pathRoutes = [
    [
      { q: -5, r: 0 }, { q: -4, r: 0 }, { q: -3, r: 0 },
      { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -1, r: 1 },
      { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 0, r: 1 }, { q: 0, r: 0 }
    ],
    [
      { q: 5, r: -2 }, { q: 4, r: -1 }, { q: 3, r: -1 },
      { q: 3, r: 0 }, { q: 2, r: 0 }, { q: 1, r: 0 },
      { q: 1, r: -1 }, { q: 1, r: -2 }, { q: 0, r: -1 }, { q: 0, r: 0 }
    ],
    [
      { q: 0, r: -5 }, { q: 0, r: -4 }, { q: 0, r: -3 },
      { q: -1, r: -2 }, { q: -1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 0, r: 0 }
    ]
  ];
  return pathRoutes.map(route => route.map(c => hexToWorld(c.q, c.r)));
};

const loadHighScoreFromStorage = () => {
  try {
    const raw = localStorage.getItem('medievalTD_highScore');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { waves: 0, kills: 0, gold: 0 };
};

export const useGameStore = create<GameState>((set, get) => ({
  gold: 500,
  castleHp: 100,
  maxCastleHp: 100,
  currentWave: 0,
  totalWaves: 20,
  kills: 0,
  phase: 'preparing',
  waveIntervalRemaining: 0,
  selectedTowerType: null,
  selectedTowerId: null,
  buildMode: false,
  hoveredHex: null,
  towers: [],
  enemies: [],
  projectiles: [],
  particles: [],
  hexGrid: [],
  paths: [],
  castleFlash: false,
  highScore: loadHighScoreFromStorage(),
  waveConfig: {
    enemyCount: 10,
    infantryRatio: 0.5,
    cavalryRatio: 0.25,
    batteringRamRatio: 0.15,
    catapultRatio: 0.1,
    isRandom: true,
  },

  setGold: (gold) => set({ gold }),
  addGold: (amount) => set({ gold: get().gold + amount }),
  deductGold: (amount) => {
    const state = get();
    if (state.gold >= amount) {
      set({ gold: state.gold - amount });
      return true;
    }
    return false;
  },
  setCastleHp: (hp) => set({ castleHp: Math.max(0, Math.min(get().maxCastleHp, hp)) }),
  damageCastle: (damage) => {
    const state = get();
    const newHp = Math.max(0, state.castleHp - damage);
    set({ castleHp: newHp, castleFlash: true });
    setTimeout(() => set({ castleFlash: false }), 300);
    if (newHp <= 0) {
      set({ phase: 'gameOver' });
      get().saveHighScore();
    }
  },
  triggerCastleFlash: () => {
    set({ castleFlash: true });
    setTimeout(() => set({ castleFlash: false }), 300);
  },
  setPhase: (phase) => set({ phase }),
  setCurrentWave: (wave) => set({ currentWave: wave }),
  addKill: () => set({ kills: get().kills + 1 }),
  setSelectedTowerType: (type) => set({ selectedTowerType: type, buildMode: type !== null, selectedTowerId: null }),
  setBuildMode: (mode) => set({ buildMode: mode }),
  setHoveredHex: (hex) => set({ hoveredHex: hex }),
  selectTower: (id) => set({ selectedTowerId: id, buildMode: false, selectedTowerType: null }),

  addTower: (tower) => set({ towers: [...get().towers, tower] }),
  upgradeTower: (towerId) => {
    const state = get();
    const tower = state.towers.find(t => t.id === towerId);
    if (!tower) return false;
    const rankOrder: TowerRank[] = ['D', 'C', 'B', 'A', 'S'];
    const idx = rankOrder.indexOf(tower.rank);
    if (idx >= rankOrder.length - 1) return false;
    const cost = getUpgradeCost(tower.rank, tower.type);
    if (!get().deductGold(cost)) return false;
    const newRank = rankOrder[idx + 1];
    const upgraded = { ...tower, rank: newRank, ...getRankUpgrade(newRank, tower.type) };
    set({ towers: state.towers.map(t => t.id === towerId ? upgraded : t) });
    return true;
  },
  removeTower: (towerId) => set({ towers: get().towers.filter(t => t.id !== towerId) }),
  updateTowers: (towers) => set({ towers }),

  setEnemies: (enemies) => set({ enemies }),
  addEnemies: (enemies) => set({ enemies: [...get().enemies, ...enemies] }),
  updateEnemies: (enemies) => set({ enemies }),

  addProjectile: (proj) => set({ projectiles: [...get().projectiles, proj] }),
  removeProjectile: (id) => set({ projectiles: get().projectiles.filter(p => p.id !== id) }),
  updateProjectiles: (projs) => set({ projectiles: projs }),

  addParticle: (particle) => set({ particles: [...get().particles, particle] }),
  removeParticle: (id) => set({ particles: get().particles.filter(p => p.id !== id) }),
  updateParticles: (particles) => set({ particles }),

  setWaveIntervalRemaining: (time) => set({ waveIntervalRemaining: time }),

  startWave: () => {
    const state = get();
    if (state.phase === 'waveActive') return;
    if (state.currentWave >= state.totalWaves) {
      set({ phase: 'victory' });
      get().saveHighScore();
      return;
    }
    set({ currentWave: state.currentWave + 1, phase: 'waveActive' });
  },

  setWaveConfig: (config) => set({ waveConfig: { ...get().waveConfig, ...config } }),

  loadHighScore: () => set({ highScore: loadHighScoreFromStorage() }),

  saveHighScore: () => {
    const state = get();
    const current = {
      waves: state.currentWave,
      kills: state.kills,
      gold: state.gold,
    };
    const prev = loadHighScoreFromStorage();
    const isBetter =
      current.waves > prev.waves ||
      (current.waves === prev.waves && current.kills > prev.kills);
    const best = isBetter ? current : prev;
    try {
      localStorage.setItem('medievalTD_highScore', JSON.stringify(best));
    } catch { /* ignore */ }
    set({ highScore: best });
  },

  resetGame: () => {
    set({
      gold: 500,
      castleHp: 100,
      maxCastleHp: 100,
      currentWave: 0,
      kills: 0,
      phase: 'preparing',
      waveIntervalRemaining: 0,
      selectedTowerType: null,
      selectedTowerId: null,
      buildMode: false,
      hoveredHex: null,
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      castleFlash: false,
    });
    get().loadHighScore();
  },

  initializeGrid: () => {
    set({
      hexGrid: generateHexGrid(),
      paths: getInitialPaths(),
    });
  },
}));

export const TOWER_COSTS: Record<TowerType, number> = {
  arrow: 80,
  magic: 150,
  stone: 250,
};

export const TOWER_BASE_STATS: Record<TowerType, { damage: number; range: number; attackSpeed: number }> = {
  arrow: { damage: 12, range: 5, attackSpeed: 1.2 },
  magic: { damage: 8, range: 4.5, attackSpeed: 0.8 },
  stone: { damage: 25, range: 4, attackSpeed: 0.5 },
};

export function getUpgradeCost(currentRank: TowerRank, type: TowerType): number {
  const base = TOWER_COSTS[type];
  const multipliers: Record<TowerRank, number> = {
    D: 0.5,
    C: 0.8,
    B: 1.2,
    A: 1.8,
    S: 0,
  };
  return Math.round(base * multipliers[currentRank]);
}

export function getRankUpgrade(rank: TowerRank, type: TowerType): Partial<Tower> {
  const base = TOWER_BASE_STATS[type];
  const rankMult: Record<TowerRank, { dmg: number; range: number; spd: number }> = {
    D: { dmg: 1, range: 1, spd: 1 },
    C: { dmg: 1.3, range: 1.1, spd: 1.1 },
    B: { dmg: 1.7, range: 1.2, spd: 1.15 },
    A: { dmg: 2.2, range: 1.3, spd: 1.2 },
    S: { dmg: 3, range: 1.5, spd: 1.3 },
  };
  const m = rankMult[rank];
  const result: Partial<Tower> = {
    damage: Math.round(base.damage * m.dmg),
    range: base.range * m.range,
    attackSpeed: base.attackSpeed * m.spd,
  };
  if (rank === 'A' || rank === 'S') {
    if (type === 'arrow') result.specialEffect = 'doubleShot';
    if (type === 'magic') result.specialEffect = 'freeze';
    if (type === 'stone') result.specialEffect = 'stun';
  }
  return result;
}

export const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; damage: number; gold: number }> = {
  infantry: { hp: 80, speed: 1.0, damage: 5, gold: 10 },
  cavalry: { hp: 50, speed: 2.0, damage: 3, gold: 15 },
  batteringRam: { hp: 200, speed: 0.6, damage: 20, gold: 30 },
  catapult: { hp: 100, speed: 0.8, damage: 8, gold: 25 },
};

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export { hexToWorld, HEX_SIZE };
