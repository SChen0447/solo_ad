import { create } from 'zustand';
import {
  Tower,
  Enemy,
  Projectile,
  Particle,
  GameState,
  GameStats,
  TowerType,
  Position,
  TOWER_CONFIGS,
  INITIAL_GOLD,
  INITIAL_LIVES,
  MAX_WAVES,
  PREP_TIME,
  COMBO_TIMEOUT,
  FloatingText,
  GridCell,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
} from '../game/types';

interface GameStore {
  gameState: GameState;
  gold: number;
  lives: number;
  currentWave: number;
  prepTime: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  stats: GameStats;
  grid: GridCell[][];
  selectedCell: { x: number; y: number } | null;
  selectedTower: string | null;
  hoveredCell: { x: number; y: number } | null;
  waveProgress: number;
  totalEnemiesInWave: number;
  spawnedEnemies: number;
  sellCooldown: Record<string, number>;
  screenShake: { intensity: number; duration: number };
  goldAnimation: { amount: number; timer: number };
  livesAnimation: { timer: number };

  setGameState: (state: GameState) => void;
  addGold: (amount: number, position?: Position) => void;
  spendGold: (amount: number) => boolean;
  addTower: (tower: Tower) => void;
  upgradeTower: (towerId: string) => boolean;
  sellTower: (towerId: string) => void;
  addEnemy: (enemy: Enemy) => void;
  removeEnemy: (enemyId: string, killed: boolean, position?: Position) => void;
  damageEnemy: (enemyId: string, damage: number) => number;
  addProjectile: (projectile: Projectile) => void;
  removeProjectile: (projectileId: string) => void;
  addParticle: (particle: Particle) => void;
  addFloatingText: (text: FloatingText) => void;
  takeDamage: (amount: number) => void;
  nextWave: () => void;
  startWave: () => void;
  updatePrepTime: (delta: number) => void;
  setSelectedCell: (cell: { x: number; y: number } | null) => void;
  setSelectedTower: (towerId: string | null) => void;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  updateWaveProgress: (spawned: number, total: number) => void;
  incrementSpawned: () => void;
  setCellOccupied: (gridX: number, gridY: number, occupied: boolean) => void;
  updateStatsDamage: (damage: number) => void;
  updateComboTimer: (delta: number) => void;
  triggerScreenShake: (intensity: number, duration: number) => void;
  updateScreenShake: (delta: number) => void;
  updateAnimations: (delta: number) => void;
  resetGame: () => void;
  initGrid: () => void;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

const createInitialGrid = (): GridCell[][] => {
  const grid: GridCell[][] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      row.push({
        x,
        y,
        isOccupied: false,
        isPath: false,
      });
    }
    grid.push(row);
  }
  return grid;
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: 'preparing',
  gold: INITIAL_GOLD,
  lives: INITIAL_LIVES,
  currentWave: 1,
  prepTime: PREP_TIME,
  towers: [],
  enemies: [],
  projectiles: [],
  particles: [],
  floatingTexts: [],
  stats: {
    totalKills: 0,
    maxCombo: 0,
    currentCombo: 0,
    totalGoldEarned: 0,
    totalDamageDealt: 0,
    comboTimer: 0,
  },
  grid: createInitialGrid(),
  selectedCell: null,
  selectedTower: null,
  hoveredCell: null,
  waveProgress: 0,
  totalEnemiesInWave: 0,
  spawnedEnemies: 0,
  sellCooldown: {},
  screenShake: { intensity: 0, duration: 0 },
  goldAnimation: { amount: 0, timer: 0 },
  livesAnimation: { timer: 0 },

  setGameState: (state) => set({ gameState: state }),

  addGold: (amount, position) => {
    set((state) => {
      const newStats = { ...state.stats };
      newStats.totalGoldEarned += amount;
      newStats.currentCombo += 1;
      newStats.comboTimer = COMBO_TIMEOUT;
      if (newStats.currentCombo > newStats.maxCombo) {
        newStats.maxCombo = newStats.currentCombo;
      }

      if (position) {
        const floatText: FloatingText = {
          id: generateId(),
          text: `+${amount}`,
          position: { ...position },
          color: '#ffd700',
          life: 1000,
          maxLife: 1000,
          velocity: { x: 0, y: -0.8 },
        };
        return {
          gold: state.gold + amount,
          stats: newStats,
          goldAnimation: { amount, timer: 500 },
          floatingTexts: [...state.floatingTexts, floatText],
        };
      }

      return {
        gold: state.gold + amount,
        stats: newStats,
        goldAnimation: { amount, timer: 500 },
      };
    });
  },

  spendGold: (amount) => {
    const { gold } = get();
    if (gold >= amount) {
      set({ gold: gold - amount });
      return true;
    }
    return false;
  },

  addTower: (tower) => {
    set((state) => ({
      towers: [...state.towers, tower],
    }));
    get().setCellOccupied(tower.gridX, tower.gridY, true);
  },

  upgradeTower: (towerId) => {
    const { towers, gold } = get();
    const tower = towers.find((t) => t.id === towerId);
    if (!tower || tower.level >= 3) return false;

    const config = TOWER_CONFIGS[tower.type];
    const upgradeCost = Math.floor(config.cost * 0.6 * tower.level);

    if (gold < upgradeCost) return false;

    set((state) => ({
      gold: state.gold - upgradeCost,
      towers: state.towers.map((t) => {
        if (t.id === towerId) {
          const newLevel = t.level + 1;
          const baseConfig = TOWER_CONFIGS[t.type];
          return {
            ...t,
            level: newLevel,
            damage: Math.floor(baseConfig.damage * (1 + 0.2 * (newLevel - 1))),
            range: Math.floor(baseConfig.range * (1 + 0.05 * (newLevel - 1))),
          };
        }
        return t;
      }),
    }));
    return true;
  },

  sellTower: (towerId) => {
    const { towers, sellCooldown } = get();
    const tower = towers.find((t) => t.id === towerId);
    if (!tower) return;

    const now = Date.now();
    const lastSell = sellCooldown[towerId] || 0;
    if (now - lastSell < 5000) return;

    const config = TOWER_CONFIGS[tower.type];
    const refund = Math.floor(config.cost * 0.5 * tower.level);

    set((state) => ({
      towers: state.towers.filter((t) => t.id !== towerId),
      gold: state.gold + refund,
      sellCooldown: { ...state.sellCooldown, [towerId]: now },
    }));

    get().setCellOccupied(tower.gridX, tower.gridY, false);
  },

  addEnemy: (enemy) => {
    set((state) => ({
      enemies: [...state.enemies, enemy],
    }));
  },

  removeEnemy: (enemyId, killed, position) => {
    set((state) => {
      const enemy = state.enemies.find((e) => e.id === enemyId);
      if (!enemy) return {};

      const updates: Partial<GameStore> = {
        enemies: state.enemies.filter((e) => e.id !== enemyId),
      };

      if (killed) {
        const newStats = { ...state.stats };
        newStats.totalKills += 1;

        if (position) {
          const floatText: FloatingText = {
            id: generateId(),
            text: `+${enemy.reward}`,
            position: { ...position },
            color: '#ffd700',
            life: 1000,
            maxLife: 1000,
            velocity: { x: 0, y: -0.8 },
          };
          updates.floatingTexts = [...state.floatingTexts, floatText];
        }

        updates.gold = state.gold + enemy.reward;
        updates.stats = newStats;
        updates.goldAnimation = { amount: enemy.reward, timer: 500 };
      }

      return updates;
    });
  },

  damageEnemy: (enemyId, damage) => {
    let actualDamage = 0;
    set((state) => ({
      enemies: state.enemies.map((e) => {
        if (e.id === enemyId) {
          let remainingDamage = damage;
          let newShield = e.shieldHealth;
          let newHealth = e.health;

          if (e.hasShield && e.shieldHealth > 0) {
            const shieldDamage = Math.min(e.shieldHealth, remainingDamage);
            newShield -= shieldDamage;
            remainingDamage -= shieldDamage;
          }

          newHealth = Math.max(0, e.health - remainingDamage);
          actualDamage = damage;

          return { ...e, shieldHealth: newShield, health: newHealth };
        }
        return e;
      }),
    }));
    get().updateStatsDamage(actualDamage);
    return actualDamage;
  },

  addProjectile: (projectile) => {
    set((state) => ({
      projectiles: [...state.projectiles, projectile],
    }));
  },

  removeProjectile: (projectileId) => {
    set((state) => ({
      projectiles: state.projectiles.filter((p) => p.id !== projectileId),
    }));
  },

  addParticle: (particle) => {
    set((state) => {
      if (state.particles.length >= 30) {
        return {
          particles: [...state.particles.slice(1), particle],
        };
      }
      return {
        particles: [...state.particles, particle],
      };
    });
  },

  addFloatingText: (text) => {
    set((state) => ({
      floatingTexts: [...state.floatingTexts, text],
    }));
  },

  takeDamage: (amount) => {
    set((state) => {
      const newLives = Math.max(0, state.lives - amount);
      const newState = newLives <= 0 ? 'defeat' : state.gameState;
      return {
        lives: newLives,
        gameState: newState,
        livesAnimation: { timer: 500 },
        screenShake: { intensity: 5, duration: 200 },
      };
    });
  },

  nextWave: () => {
    set((state) => ({
      currentWave: state.currentWave + 1,
      prepTime: PREP_TIME,
      gameState: 'preparing',
      waveProgress: 0,
      totalEnemiesInWave: 0,
      spawnedEnemies: 0,
    }));
  },

  startWave: () => {
    set({
      gameState: 'playing',
      prepTime: 0,
    });
  },

  updatePrepTime: (delta) => {
    set((state) => {
      const newPrepTime = state.prepTime - delta / 1000;
      if (newPrepTime <= 0) {
        return {
          prepTime: 0,
          gameState: 'playing',
        };
      }
      return { prepTime: newPrepTime };
    });
  },

  setSelectedCell: (cell) => set({ selectedCell: cell, selectedTower: null }),
  setSelectedTower: (towerId) => set({ selectedTower: towerId, selectedCell: null }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),

  updateWaveProgress: (spawned, total) => {
    set({
      spawnedEnemies: spawned,
      totalEnemiesInWave: total,
      waveProgress: total > 0 ? spawned / total : 0,
    });
  },

  incrementSpawned: () => {
    set((state) => ({
      spawnedEnemies: state.spawnedEnemies + 1,
      waveProgress:
        state.totalEnemiesInWave > 0
          ? (state.spawnedEnemies + 1) / state.totalEnemiesInWave
          : 0,
    }));
  },

  setCellOccupied: (gridX, gridY, occupied) => {
    set((state) => {
      const newGrid = state.grid.map((row) =>
        row.map((cell) => {
          if (cell.x === gridX && cell.y === gridY) {
            return { ...cell, isOccupied: occupied };
          }
          return cell;
        })
      );
      return { grid: newGrid };
    });
  },

  updateStatsDamage: (damage) => {
    set((state) => ({
      stats: {
        ...state.stats,
        totalDamageDealt: state.stats.totalDamageDealt + damage,
      },
    }));
  },

  updateComboTimer: (delta) => {
    set((state) => {
      if (state.stats.comboTimer > 0) {
        const newTimer = state.stats.comboTimer - delta;
        if (newTimer <= 0) {
          return {
            stats: {
              ...state.stats,
              comboTimer: 0,
              currentCombo: 0,
            },
          };
        }
        return {
          stats: {
            ...state.stats,
            comboTimer: newTimer,
          },
        };
      }
      return {};
    });
  },

  triggerScreenShake: (intensity, duration) => {
    set({
      screenShake: { intensity, duration },
    });
  },

  updateScreenShake: (delta) => {
    set((state) => {
      if (state.screenShake.duration > 0) {
        return {
          screenShake: {
            intensity: state.screenShake.intensity,
            duration: Math.max(0, state.screenShake.duration - delta),
          },
        };
      }
      return {};
    });
  },

  updateAnimations: (delta) => {
    set((state) => {
      const newGoldTimer = Math.max(0, state.goldAnimation.timer - delta);
      const newLivesTimer = Math.max(0, state.livesAnimation.timer - delta);

      return {
        goldAnimation: {
          ...state.goldAnimation,
          timer: newGoldTimer,
        },
        livesAnimation: {
          timer: newLivesTimer,
        },
        floatingTexts: state.floatingTexts
          .map((ft) => ({
            ...ft,
            position: {
              x: ft.position.x + ft.velocity.x,
              y: ft.position.y + ft.velocity.y,
            },
            life: ft.life - delta,
          }))
          .filter((ft) => ft.life > 0),
      };
    });
  },

  resetGame: () => {
    set({
      gameState: 'preparing',
      gold: INITIAL_GOLD,
      lives: INITIAL_LIVES,
      currentWave: 1,
      prepTime: PREP_TIME,
      towers: [],
      enemies: [],
      projectiles: [],
      particles: [],
      floatingTexts: [],
      stats: {
        totalKills: 0,
        maxCombo: 0,
        currentCombo: 0,
        totalGoldEarned: 0,
        totalDamageDealt: 0,
        comboTimer: 0,
      },
      grid: createInitialGrid(),
      selectedCell: null,
      selectedTower: null,
      hoveredCell: null,
      waveProgress: 0,
      totalEnemiesInWave: 0,
      spawnedEnemies: 0,
      sellCooldown: {},
      screenShake: { intensity: 0, duration: 0 },
      goldAnimation: { amount: 0, timer: 0 },
      livesAnimation: { timer: 0 },
    });
  },

  initGrid: () => {
    set({ grid: createInitialGrid() });
  },
}));
