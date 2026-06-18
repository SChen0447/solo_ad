import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { saveGame, loadGame, clearSave } from '../utils/storage';

export interface Ship {
  id: string;
  name: string;
  level: number;
  maxDurability: number;
  currentDurability: number;
  cannonLevel: number;
  isDamaged: boolean;
}

export interface BattleResult {
  victory: boolean;
  goldEarned: number;
  hitsTaken: number;
  battleTime: number;
  enemiesDestroyed: number;
}

export type GameScene = 'port' | 'battle';

interface GameState {
  gold: number;
  ships: Ship[];
  currentScene: GameScene;
  selectedShipId: string | null;
  activeShipId: string | null;
  lastBattleResult: BattleResult | null;

  selectShip: (shipId: string | null) => void;
  buildShip: () => boolean;
  upgradeShip: (shipId: string) => boolean;
  repairShip: (shipId: string) => boolean;
  startBattle: (shipId: string) => void;
  endBattle: (result: BattleResult, shipId: string) => void;
  resetGame: () => void;
  initGame: () => void;
}

const SHIP_NAMES = [
  '海燕号', '飞鱼号', '猎鹰号', '苍龙号', '白虎号',
  '玄武号', '朱雀号', '雷霆号', '风暴号', '巨浪号',
  '黑珍珠号', '金鹿号', '海妖号', '征服者号', '勇者号'
];

function getRandomShipName(existingNames: string[]): string {
  const available = SHIP_NAMES.filter(n => !existingNames.includes(n));
  if (available.length === 0) {
    return `战舰${Math.floor(Math.random() * 1000)}号`;
  }
  return available[Math.floor(Math.random() * available.length)];
}

function calculateMaxDurability(level: number): number {
  return 100 + (level - 1) * 100;
}

function createInitialShip(): Ship {
  return {
    id: uuidv4(),
    name: getRandomShipName([]),
    level: 1,
    maxDurability: 150,
    currentDurability: 150,
    cannonLevel: 1,
    isDamaged: false,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  gold: 200,
  ships: [],
  currentScene: 'port',
  selectedShipId: null,
  activeShipId: null,
  lastBattleResult: null,

  selectShip: (shipId) => set({ selectedShipId: shipId }),

  buildShip: () => {
    const { gold, ships } = get();
    if (ships.length >= 5) return false;

    const cost = 200 + 20 * ships.length;
    if (gold < cost) return false;

    const newShip: Ship = {
      id: uuidv4(),
      name: getRandomShipName(ships.map(s => s.name)),
      level: 1,
      maxDurability: 150,
      currentDurability: 150,
      cannonLevel: 1,
      isDamaged: false,
    };

    const newShips = [...ships, newShip];
    const newGold = gold - cost;

    set({ gold: newGold, ships: newShips });
    saveGame({ gold: newGold, ships: newShips, lastBattleResult: get().lastBattleResult });
    return true;
  },

  upgradeShip: (shipId) => {
    const { gold, ships, lastBattleResult } = get();
    const ship = ships.find(s => s.id === shipId);
    if (!ship || ship.level >= 5) return false;

    const cost = 100 * ship.level;
    if (gold < cost) return false;

    const newLevel = ship.level + 1;
    const newMaxDurability = calculateMaxDurability(newLevel);
    const durabilityIncrease = newMaxDurability - ship.maxDurability;

    const newShips = ships.map(s => {
      if (s.id === shipId) {
        return {
          ...s,
          level: newLevel,
          maxDurability: newMaxDurability,
          currentDurability: s.currentDurability + durabilityIncrease,
          cannonLevel: Math.min(3, s.cannonLevel + (newLevel % 2 === 0 ? 1 : 0)),
        };
      }
      return s;
    });

    const newGold = gold - cost;
    set({ gold: newGold, ships: newShips });
    saveGame({ gold: newGold, ships: newShips, lastBattleResult });
    return true;
  },

  repairShip: (shipId) => {
    const { gold, ships, lastBattleResult } = get();
    const ship = ships.find(s => s.id === shipId);
    if (!ship || ship.currentDurability >= ship.maxDurability) return false;

    const cost = 50;
    if (gold < cost) return false;

    const newShips = ships.map(s => {
      if (s.id === shipId) {
        return {
          ...s,
          currentDurability: s.maxDurability,
          isDamaged: false,
        };
      }
      return s;
    });

    const newGold = gold - cost;
    set({ gold: newGold, ships: newShips });
    saveGame({ gold: newGold, ships: newShips, lastBattleResult });
    return true;
  },

  startBattle: (shipId) => {
    const ship = get().ships.find(s => s.id === shipId);
    if (!ship || ship.currentDurability <= 0 || ship.isDamaged) return;

    set({ currentScene: 'battle', activeShipId: shipId });
  },

  endBattle: (result, shipId) => {
    const { gold, ships, lastBattleResult: _prev } = get();

    const newShips = ships.map(s => {
      if (s.id === shipId) {
        const newDurability = Math.max(0, s.currentDurability - result.hitsTaken * 20);
        return {
          ...s,
          currentDurability: newDurability,
          isDamaged: newDurability <= 0,
        };
      }
      return s;
    });

    const newGold = gold + result.goldEarned;

    set({
      gold: newGold,
      ships: newShips,
      currentScene: 'port',
      activeShipId: null,
      lastBattleResult: result,
    });

    saveGame({ gold: newGold, ships: newShips, lastBattleResult: result });
  },

  resetGame: () => {
    clearSave();
    const initialShip = createInitialShip();
    set({
      gold: 200,
      ships: [initialShip],
      currentScene: 'port',
      selectedShipId: initialShip.id,
      activeShipId: null,
      lastBattleResult: null,
    });
  },

  initGame: () => {
    const saved = loadGame();
    if (saved && saved.ships.length > 0) {
      set({
        gold: saved.gold,
        ships: saved.ships,
        currentScene: 'port',
        selectedShipId: saved.ships[0]?.id || null,
        activeShipId: null,
        lastBattleResult: saved.lastBattleResult,
      });
    } else {
      const initialShip = createInitialShip();
      const initialState = {
        gold: 200,
        ships: [initialShip],
        lastBattleResult: null,
      };
      saveGame(initialState);
      set({
        ...initialState,
        currentScene: 'port',
        selectedShipId: initialShip.id,
        activeShipId: null,
      });
    }
  },
}));
