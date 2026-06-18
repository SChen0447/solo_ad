import { create } from 'zustand';
import type { GameState, GameActions, MineralType, Particle, Star, MineralVein } from '@/types/game';
import { generatePlanet, getNearestVein, mineVein, refreshVeins, isInMiningRange } from '@/planet/PlanetSystem';
import { createInitialShip, moveShip, addCargo, activateShield as activateShieldSys, upgradePart as upgradePartSys, canUpgrade, getTotalCargo } from '@/ship/ShipSystem';
import { createInitialTradeRecords, sellMineral as sellMineralSys, sellAllMinerals as sellAllSys, refuelAtStation, repairAtStation } from '@/trade/TradeSystem';
import { shouldTriggerEvent, generateEvent, handlePirateEvent, handleMeteorEvent, handleTraderEvent } from '@/events/EventSystem';
import { loadGame as loadGameStorage, saveGame as saveGameStorage, setupAutoSave } from '@/utils/persistence';
import { MINERAL_COLORS } from '@/types/game';

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 1200,
      y: Math.random() * 700,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 2 + 1,
    });
  }
  return stars;
}

function createInitialState(): GameState {
  const planet = generatePlanet();
  return {
    planet,
    ship: createInitialShip(),
    credits: 100,
    tradeRecords: createInitialTradeRecords(),
    currentEvent: null,
    showTradeModal: false,
    showUpgradeModal: false,
    travelTime: 0,
    isPaused: false,
    isAtStation: false,
    particles: [],
    stars: generateStars(100),
    miningTarget: null,
    message: null,
  };
}

export const useGameStore = create<GameState & GameActions>((set, get) => {
  let autoSaveCleanup: (() => void) | null = null;

  return {
    ...createInitialState(),

    setPlanet: (planet) => set({ planet }),

    updateShip: (updates) => set((state) => ({
      ship: { ...state.ship, ...updates },
    })),

    addCargo: (type, amount) => set((state) => {
      const result = addCargo(state.ship, type, amount);
      if (result.added > 0) {
        return { ship: result.ship };
      }
      return state;
    }),

    removeCargo: (type, amount) => set((state) => {
      const result = addCargo(state.ship, type, -amount);
      if (result.added < 0) {
        return { ship: result.ship };
      }
      return state;
    }),

    updateCredits: (amount) => set((state) => ({
      credits: Math.max(0, state.credits + amount),
    })),

    updateTradeRecords: (records) => set({ tradeRecords: records }),

    setCurrentEvent: (event) => set({ currentEvent: event, isPaused: event !== null }),

    setShowTradeModal: (show) => set({ showTradeModal: show, isPaused: show }),

    setShowUpgradeModal: (show) => set({ showUpgradeModal: show, isPaused: show }),

    setTravelTime: (time) => set({ travelTime: time }),

    setIsPaused: (paused) => set({ isPaused: paused }),

    setIsAtStation: (atStation) => set({ isAtStation: atStation }),

    addParticle: (particle) => set((state) => ({
      particles: [...state.particles, particle],
    })),

    removeParticle: (index) => set((state) => ({
      particles: state.particles.filter((_, i) => i !== index),
    })),

    updateParticles: (particles) => set({ particles }),

    setMiningTarget: (vein) => set({ miningTarget: vein }),

    setMessage: (message) => set({ message }),

    updateVein: (veinId, updates) => set((state) => {
      if (!state.planet) return state;
      return {
        planet: {
          ...state.planet,
          veins: state.planet.veins.map((v) =>
            v.id === veinId ? { ...v, ...updates } : v
          ),
        },
      };
    }),

    activateShield: () => set((state) => {
      const result = activateShieldSys(state.ship);
      if (result.success) {
        return { ship: result.ship, message: '护盾已激活！' };
      }
      return { ...state, message: '护盾无法激活！' };
    }),

    upgradePart: (part) => set((state) => {
      const check = canUpgrade(state.ship, part, state.credits);
      if (!check.canUpgrade) {
        return { ...state, message: check.reason || '无法升级' };
      }

      const cost = state.ship.parts[part].upgradeCost;
      let newCargo = { ...state.ship.cargo };
      
      for (const [mineral, amount] of Object.entries(cost.minerals)) {
        newCargo[mineral as MineralType] -= amount;
      }

      const result = upgradePartSys(
        { ...state.ship, cargo: newCargo },
        part
      );

      if (result.success) {
        return {
          ship: result.ship,
          credits: state.credits - cost.credits,
          message: `${part === 'engine' ? '引擎' : part === 'cargo' ? '货舱' : '护盾'}升级成功！`,
        };
      }
      return state;
    }),

    moveShip: (targetX, targetY, deltaTime) => set((state) => {
      if (state.isPaused || state.isAtStation) return state;

      const result = moveShip(state.ship, targetX, targetY, deltaTime);
      
      const stateAfterMove = {
        ...state,
        ship: result.ship,
        travelTime: state.travelTime + deltaTime,
      };

      if (state.planet) {
        const nearestVein = getNearestVein(state.planet, result.ship.x, result.ship.y);
        return {
          ...stateAfterMove,
          miningTarget: nearestVein,
        };
      }

      return stateAfterMove;
    }),

    consumeFuel: (amount) => set((state) => ({
      ship: { ...state.ship, fuel: Math.max(0, state.ship.fuel - amount) },
    })),

    applyDamage: (damage) => set((state) => {
      let remainingDamage = damage;
      let newShield = state.ship.shield;
      let newHull = state.ship.hull;

      if (state.ship.shieldActive && state.ship.shield > 0) {
        const shieldDamage = Math.min(remainingDamage, state.ship.shield);
        newShield = state.ship.shield - shieldDamage;
        remainingDamage -= shieldDamage;
      }

      newHull = Math.max(0, state.ship.hull - remainingDamage);

      return {
        ship: { ...state.ship, shield: newShield, hull: newHull },
      };
    }),

    mineNearestVein: () => set((state) => {
      if (!state.planet || !state.miningTarget) {
        return { ...state, message: '附近没有可采集的矿脉' };
      }

      const vein = state.miningTarget;
      if (!isInMiningRange(state.ship.x, state.ship.y, vein.x, vein.y)) {
        return { ...state, message: '距离矿脉太远' };
      }

      const totalCargo = getTotalCargo(state.ship.cargo);
      if (totalCargo >= state.ship.cargoCapacity) {
        return { ...state, message: '货舱已满' };
      }

      const mineAmount = Math.min(5, vein.amount, state.ship.cargoCapacity - totalCargo);
      const result = mineVein(vein, mineAmount);

      if (!result.success) {
        return { ...state, message: '矿脉已枯竭' };
      }

      const cargoResult = addCargo(state.ship, vein.type, result.mined);
      
      const newParticles: Particle[] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        newParticles.push({
          x: vein.x,
          y: vein.y,
          vx: Math.cos(angle) * (2 + Math.random() * 2),
          vy: Math.sin(angle) * (2 + Math.random() * 2),
          life: 30,
          maxLife: 30,
          color: MINERAL_COLORS[vein.type],
          size: 3 + Math.random() * 2,
        });
      }

      const updatedVeins = state.planet.veins.map((v) =>
        v.id === vein.id ? result.updatedVein : v
      );

      const updatedPlanet = { ...state.planet, veins: updatedVeins };
      const newNearestVein = getNearestVein(updatedPlanet, cargoResult.ship.x, cargoResult.ship.y);

      return {
        planet: updatedPlanet,
        ship: cargoResult.ship,
        particles: [...state.particles, ...newParticles],
        miningTarget: newNearestVein,
        message: `采集了 ${result.mined} 单位矿物`,
      };
    }),

    travelToStation: () => set((state) => {
      if (state.ship.fuel < 20) {
        return { ...state, message: '燃料不足，无法前往空间站' };
      }

      const triggerEvent = shouldTriggerEvent(0.2);
      
      if (triggerEvent) {
        const event = generateEvent(state.ship);
        return {
          ...state,
          ship: { ...state.ship, fuel: state.ship.fuel - 10 },
          currentEvent: event,
          isPaused: true,
          message: null,
        };
      }

      return {
        ...state,
        ship: { ...state.ship, fuel: state.ship.fuel - 20, x: 100, y: 350 },
        isAtStation: true,
        showTradeModal: true,
        message: '已到达空间站',
      };
    }),

    travelToNewPlanet: () => set((state) => {
      if (state.ship.fuel < 30) {
        return { ...state, message: '燃料不足，无法前往新星球' };
      }

      const triggerEvent = shouldTriggerEvent(0.2);
      
      if (triggerEvent) {
        const event = generateEvent(state.ship);
        return {
          ...state,
          ship: { ...state.ship, fuel: state.ship.fuel - 15 },
          currentEvent: event,
          isPaused: true,
          message: null,
        };
      }

      const newPlanet = generatePlanet();
      return {
        ...state,
        planet: newPlanet,
        ship: { ...state.ship, fuel: state.ship.fuel - 30, x: 100, y: 350 },
        isAtStation: false,
        miningTarget: null,
        message: `已到达 ${newPlanet.name}`,
      };
    }),

    sellMineral: (type, amount) => set((state) => {
      const result = sellMineralSys(state.ship, type, amount, state.tradeRecords);
      if (result.sold > 0) {
        return {
          ship: result.ship,
          credits: state.credits + result.credits,
          tradeRecords: result.updatedRecords,
          message: `出售了 ${result.sold} 单位矿物，获得 ${result.credits} 金币`,
        };
      }
      return { ...state, message: '没有足够的矿物可出售' };
    }),

    triggerRandomEvent: () => set((state) => {
      const event = generateEvent(state.ship);
      return { currentEvent: event, isPaused: true };
    }),

    handleEventOption: (optionId) => set((state) => {
      if (!state.currentEvent) return state;

      let result: { ship: typeof state.ship; message: string };
      
      switch (state.currentEvent.type) {
        case 'pirate':
          result = handlePirateEvent(state.ship, optionId as 'surrender' | 'fight' | 'flee');
          break;
        case 'meteor':
          result = handleMeteorEvent(state.ship, optionId as 'endure' | 'evade');
          break;
        case 'trader':
          result = handleTraderEvent(state.ship, optionId);
          break;
        default:
          return { ...state, currentEvent: null, isPaused: false };
      }

      return {
        ...state,
        ship: result.ship,
        currentEvent: null,
        isPaused: false,
        message: result.message,
      };
    }),

    loadGame: () => {
      const saved = loadGameStorage();
      if (saved) {
        set((state) => ({
          ...state,
          ...saved,
          particles: [],
          stars: generateStars(100),
          currentEvent: null,
          showTradeModal: false,
          showUpgradeModal: false,
          isPaused: false,
          message: '游戏已加载',
        }));
      }
    },

    saveGame: () => {
      const state = get();
      saveGameStorage({
        planet: state.planet,
        ship: state.ship,
        credits: state.credits,
        tradeRecords: state.tradeRecords,
        travelTime: state.travelTime,
      });
      set({ message: '游戏已保存' });
    },

    resetGame: () => {
      const newState = createInitialState();
      set(newState);
      if (autoSaveCleanup) {
        autoSaveCleanup();
      }
      autoSaveCleanup = setupAutoSave(() => {
        const s = get();
        return {
          planet: s.planet,
          ship: s.ship,
          credits: s.credits,
          tradeRecords: s.tradeRecords,
          travelTime: s.travelTime,
        };
      });
    },
  };
});

export function initializeGame() {
  const store = useGameStore.getState();
  const saved = loadGameStorage();
  
  if (saved) {
    store.loadGame();
  } else {
    store.resetGame();
  }
}

export function useShip() {
  return useGameStore((state) => state.ship);
}

export function usePlanet() {
  return useGameStore((state) => state.planet);
}

export function useCredits() {
  return useGameStore((state) => state.credits);
}

export function useTradeRecords() {
  return useGameStore((state) => state.tradeRecords);
}

export function useCurrentEvent() {
  return useGameStore((state) => state.currentEvent);
}

export { refuelAtStation, repairAtStation, sellAllSys };
