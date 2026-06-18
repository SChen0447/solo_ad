import { create } from 'zustand';
import {
  Crystal,
  CraftResult,
  Particle,
  ElementType,
  TileType,
  MAX_CRYSTALS,
  CRAFT_SLOT_COUNT,
} from '@/types';
import { generateMap, spawnCrystal, MapData } from '@/game/mapGen';
import { craft, findMatchingRecipe } from '@/game/crafting';

interface GameState {
  playerX: number;
  playerY: number;
  playerSpeed: number;
  inventory: Crystal[];
  tiles: TileType[][];
  crystals: Crystal[];
  alchemistTableX: number;
  alchemistTableY: number;
  isNearTable: boolean;
  showInventory: boolean;
  showCraftingPanel: boolean;
  craftingSlots: (Crystal | null)[];
  craftResult: CraftResult | null;
  showCraftResult: boolean;
  craftHistory: CraftResult[];
  showCraftHistory: boolean;
  particles: Particle[];
  keysPressed: Set<string>;
  cameraX: number;
  cameraY: number;
  matchedRecipe: ReturnType<typeof findMatchingRecipe>;
  interactionPulse: number;

  initGame: () => void;
  setPlayerPosition: (x: number, y: number, speed: number) => void;
  setKeysPressed: (keys: Set<string>) => void;
  collectCrystals: (ids: string[]) => void;
  setNearTable: (near: boolean) => void;
  toggleInventory: () => void;
  setCraftingSlot: (index: number, crystal: Crystal | null) => void;
  removeFromCraftingSlot: (index: number) => void;
  performCraft: () => void;
  clearCraftResult: () => void;
  toggleCraftHistory: () => void;
  addParticles: (x: number, y: number, color: string, count: number) => void;
  updateParticles: (dt: number) => void;
  respawnCrystal: () => void;
  setCamera: (x: number, y: number) => void;
  setInteractionPulse: (v: number) => void;
  returnCrystalToInventory: (slotIndex: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerX: 0,
  playerY: 0,
  playerSpeed: 4,
  inventory: [],
  tiles: [],
  crystals: [],
  alchemistTableX: 0,
  alchemistTableY: 0,
  isNearTable: false,
  showInventory: false,
  showCraftingPanel: false,
  craftingSlots: Array(CRAFT_SLOT_COUNT).fill(null),
  craftResult: null,
  showCraftResult: false,
  craftHistory: [],
  showCraftHistory: false,
  particles: [],
  keysPressed: new Set(),
  cameraX: 0,
  cameraY: 0,
  matchedRecipe: null,
  interactionPulse: 0.45,

  initGame: () => {
    const mapData: MapData = generateMap();
    const startX = mapData.alchemistTableX;
    const startY = mapData.alchemistTableY + 100;
    set({
      tiles: mapData.tiles,
      crystals: mapData.crystals,
      alchemistTableX: mapData.alchemistTableX,
      alchemistTableY: mapData.alchemistTableY,
      playerX: startX,
      playerY: startY,
      cameraX: startX - 400,
      cameraY: startY - 300,
    });
  },

  setPlayerPosition: (x, y, speed) => set({ playerX: x, playerY: y, playerSpeed: speed }),

  setKeysPressed: (keys) => set({ keysPressed: keys }),

  collectCrystals: (ids) => {
    const state = get();
    const updatedCrystals = state.crystals.map((c) =>
      ids.includes(c.id) ? { ...c, collected: true } : c
    );
    const collected = state.crystals.filter((c) => ids.includes(c.id));
    const newInventory = [...state.inventory, ...collected];
    set({ crystals: updatedCrystals, inventory: newInventory });
  },

  setNearTable: (near) => {
    const state = get();
    const showPanel = near;
    if (!near) {
      const slotsToReturn = state.craftingSlots.filter((s) => s !== null) as Crystal[];
      set({
        isNearTable: near,
        showCraftingPanel: showPanel,
        craftingSlots: Array(CRAFT_SLOT_COUNT).fill(null),
        inventory: [...state.inventory, ...slotsToReturn],
        craftResult: null,
        showCraftResult: false,
        matchedRecipe: null,
      });
    } else {
      set({ isNearTable: near, showCraftingPanel: showPanel });
    }
  },

  toggleInventory: () => set((s) => ({ showInventory: !s.showInventory })),

  setCraftingSlot: (index, crystal) => {
    const state = get();
    const newSlots = [...state.craftingSlots];
    newSlots[index] = crystal;
    const newInventory = crystal
      ? state.inventory.filter((c) => c.id !== crystal.id)
      : state.inventory;
    const slotElements = newSlots.map((s) => (s ? s.element : null));
    const matched = findMatchingRecipe(slotElements);
    set({ craftingSlots: newSlots, inventory: newInventory, matchedRecipe: matched });
  },

  removeFromCraftingSlot: (index) => {
    const state = get();
    const crystal = state.craftingSlots[index];
    if (!crystal) return;
    const newSlots = [...state.craftingSlots];
    newSlots[index] = null;
    const newInventory = [...state.inventory, crystal];
    const slotElements = newSlots.map((s) => (s ? s.element : null));
    const matched = findMatchingRecipe(slotElements);
    set({ craftingSlots: newSlots, inventory: newInventory, matchedRecipe: matched });
  },

  returnCrystalToInventory: (slotIndex) => {
    const state = get();
    const crystal = state.craftingSlots[slotIndex];
    if (!crystal) return;
    const newSlots = [...state.craftingSlots];
    newSlots[slotIndex] = null;
    const newInventory = [...state.inventory, crystal];
    const slotElements = newSlots.map((s) => (s ? s.element : null));
    const matched = findMatchingRecipe(slotElements);
    set({ craftingSlots: newSlots, inventory: newInventory, matchedRecipe: matched });
  },

  performCraft: () => {
    const state = get();
    const slotElements = state.craftingSlots.map((s) => (s ? s.element : null));
    const result = craft(slotElements);
    if (!result) return;

    const newHistory = [result, ...state.craftHistory].slice(0, 10);
    const panelCenterX = 600;
    const panelCenterY = 400;
    set({
      craftResult: result,
      showCraftResult: true,
      craftHistory: newHistory,
      craftingSlots: Array(CRAFT_SLOT_COUNT).fill(null),
      matchedRecipe: null,
    });

    get().addParticles(panelCenterX, panelCenterY, result.color, 30);

    setTimeout(() => {
      get().clearCraftResult();
    }, 3000);
  },

  clearCraftResult: () => set({ craftResult: null, showCraftResult: false }),

  toggleCraftHistory: () => set((s) => ({ showCraftHistory: !s.showCraftHistory })),

  addParticles: (x, y, color, count) => {
    const state = get();
    const newParticles: Particle[] = [];
    for (let i = 0; i < count && state.particles.length + newParticles.length < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2,
        maxLife: 2,
        color,
        size: 3 + Math.random() * 4,
      });
    }
    set({ particles: [...state.particles, ...newParticles] });
  },

  updateParticles: (dt) => {
    const state = get();
    const updated = state.particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        life: p.life - dt,
        size: p.size * (p.life / p.maxLife),
      }))
      .filter((p) => p.life > 0);
    set({ particles: updated });
  },

  respawnCrystal: () => {
    const state = get();
    const activeCrystals = state.crystals.filter((c) => !c.collected);
    if (activeCrystals.length >= MAX_CRYSTALS) return;
    const newCrystal = spawnCrystal(state.tiles, state.playerX, state.playerY, state.crystals);
    if (newCrystal) {
      set({ crystals: [...state.crystals, newCrystal] });
    }
  },

  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),

  setInteractionPulse: (v) => set({ interactionPulse: v }),
}));
