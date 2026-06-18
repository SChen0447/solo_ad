import { create } from 'zustand';
import {
  GameState,
  RuneType,
  Plant,
  Leaf,
  Flower,
  Crystal,
  FLOWER_COLORS,
  RUNE_COST,
  ENERGY_REGEN_INTERVAL,
  ENERGY_REGEN_AMOUNT,
  WATER_DECAY_INTERVAL,
  WATER_COOLDOWN,
  WATER_AMOUNT,
  MAX_STEM_HEIGHT,
  MIN_STEM_HEIGHT,
  GROWTH_INCREMENT,
  FLOWER_LIFETIME,
  MUTATION_LIFETIME,
  GROWTH_ANIM_DURATION,
  BLOOM_ANIM_DURATION,
  WILT_THRESHOLD,
  uid,
  rand,
  clamp,
} from './types';

const createInitialPlant = (): Plant => ({
  id: uid(),
  stemHeight: MIN_STEM_HEIGHT,
  leaves: [],
  flowers: [],
  crystals: [],
  isMutating: false,
  mutationEndsAt: 0,
  growthAnimation: 0,
  bloomAnimation: 0,
  wilting: false,
  dirty: true,
});

const updateWilting = (plant: Plant, water: number): Plant => {
  const wilting = water < WILT_THRESHOLD;
  if (wilting !== plant.wilting) {
    return { ...plant, wilting, dirty: true };
  }
  return plant;
};

const applyGrowth = (plant: Plant, now: number): Plant => {
  if (plant.stemHeight >= MAX_STEM_HEIGHT) return { ...plant, dirty: false };

  const newHeight = clamp(plant.stemHeight + GROWTH_INCREMENT, MIN_STEM_HEIGHT, MAX_STEM_HEIGHT);
  const nextLeafY = plant.stemHeight - 10 + GROWTH_INCREMENT;
  const side: 'left' | 'right' = plant.leaves.length % 2 === 0 ? 'left' : 'right';
  const maxColorIndex = 10;
  const colorIndex = clamp(plant.leaves.length, 0, maxColorIndex);
  const newLeaf: Leaf = {
    id: uid(),
    side,
    y: Math.max(MIN_STEM_HEIGHT * 0.4, nextLeafY),
    colorIndex,
  };

  return {
    ...plant,
    stemHeight: newHeight,
    leaves: [...plant.leaves, newLeaf],
    growthAnimation: now + GROWTH_ANIM_DURATION,
    dirty: true,
  };
};

const applyBloom = (plant: Plant, now: number): Plant => {
  const color = FLOWER_COLORS[rand(0, FLOWER_COLORS.length - 1)];
  const petalCount = rand(5, 7);
  const flower: Flower = {
    id: uid(),
    color,
    petalCount,
    createdAt: now,
    x: 0,
    y: -plant.stemHeight,
  };

  return {
    ...plant,
    flowers: [...plant.flowers, flower],
    bloomAnimation: now + BLOOM_ANIM_DURATION,
    dirty: true,
  };
};

const applyMutation = (plant: Plant, now: number): Plant => {
  const crystals: Crystal[] = [];
  const crystalCount = rand(2, 4);
  for (let i = 0; i < crystalCount; i++) {
    crystals.push({
      id: uid(),
      x: rand(-20, 20),
      y: -rand(Math.floor(plant.stemHeight * 0.2), Math.floor(plant.stemHeight * 0.9)),
      rotation: rand(0, 360),
    });
  }

  return {
    ...plant,
    isMutating: true,
    mutationEndsAt: now + MUTATION_LIFETIME,
    crystals: [...plant.crystals, ...crystals],
    dirty: true,
  };
};

const prunePlant = (plant: Plant, now: number): Plant => {
  let changed = false;

  const liveFlowers = plant.flowers.filter(f => {
    const alive = now - f.createdAt < FLOWER_LIFETIME;
    if (!alive) changed = true;
    return alive;
  });

  const wasMutating = plant.isMutating;
  const isMutating = plant.isMutating && now < plant.mutationEndsAt;
  let liveCrystals = plant.crystals;
  if (wasMutating && !isMutating) {
    liveCrystals = [];
    changed = true;
  }

  if (changed || wasMutating !== isMutating) {
    return {
      ...plant,
      flowers: liveFlowers,
      isMutating,
      crystals: liveCrystals,
      dirty: true,
    };
  }
  return plant;
};

export const useGameStore = create<GameState>((set, get) => ({
  energy: 100,
  maxEnergy: 200,
  water: 50,
  waterCooldownUntil: 0,
  plants: [createInitialPlant()],
  selectedRuneId: null,
  lastEnergyRegen: Date.now(),
  lastWaterDecay: Date.now(),
  runeFeedback: null,

  applyRune: (runeType: RuneType): boolean => {
    const state = get();
    if (state.energy < RUNE_COST) {
      set({ runeFeedback: { type: 'error', msg: '能量不足！需要20点能量', time: Date.now() } });
      return false;
    }

    const now = Date.now();
    const plant = state.plants[0];
    let updatedPlant: Plant;

    switch (runeType) {
      case 'growth':
        if (plant.stemHeight >= MAX_STEM_HEIGHT) {
          set({ runeFeedback: { type: 'error', msg: '植物已达到最大高度', time: now } });
          return false;
        }
        updatedPlant = applyGrowth(plant, now);
        break;
      case 'bloom':
        updatedPlant = applyBloom(plant, now);
        break;
      case 'mutation':
        updatedPlant = applyMutation(plant, now);
        break;
    }

    updatedPlant = updateWilting(updatedPlant, state.water);
    const runeNames = { growth: '生长符文', bloom: '开花符文', mutation: '异变符文' };

    set({
      energy: state.energy - RUNE_COST,
      plants: [updatedPlant],
      selectedRuneId: runeType,
      runeFeedback: { type: 'success', msg: `${runeNames[runeType]}激活！`, time: now },
    });
    return true;
  },

  waterPlant: (): boolean => {
    const state = get();
    const now = Date.now();
    if (now < state.waterCooldownUntil) {
      return false;
    }
    const newWater = clamp(state.water + WATER_AMOUNT, 0, 200);
    const updatedPlants = state.plants.map(p => {
      const pruned = prunePlant(p, now);
      return updateWilting(pruned, newWater);
    });

    set({
      water: newWater,
      waterCooldownUntil: now + WATER_COOLDOWN,
      plants: updatedPlants,
    });
    return true;
  },

  updateGrowth: (now: number): void => {
    const state = get();
    let { energy, water, lastEnergyRegen, lastWaterDecay, plants } = state;
    let changed = false;

    if (now - lastEnergyRegen >= ENERGY_REGEN_INTERVAL) {
      const newEnergy = clamp(energy + ENERGY_REGEN_AMOUNT, 0, state.maxEnergy);
      if (newEnergy !== energy) {
        energy = newEnergy;
        changed = true;
      }
      lastEnergyRegen = now;
    }

    if (now - lastWaterDecay >= WATER_DECAY_INTERVAL) {
      const newWater = clamp(water - 1, 0, 200);
      if (newWater !== water) {
        water = newWater;
        changed = true;
      }
      lastWaterDecay = now;
    }

    const updatedPlants = plants.map(p => {
      let plant = prunePlant(p, now);
      if (changed || water !== state.water) {
        plant = updateWilting(plant, water);
      }
      return plant;
    });

    const plantsChanged = updatedPlants.some((p, i) => p.dirty || p !== plants[i]);

    if (changed || plantsChanged || lastEnergyRegen !== state.lastEnergyRegen || lastWaterDecay !== state.lastWaterDecay) {
      set({
        energy,
        water,
        lastEnergyRegen,
        lastWaterDecay,
        plants: updatedPlants.map(p => ({ ...p, dirty: false })),
      });
    }
  },

  clearFeedback: (): void => {
    set({ runeFeedback: null });
  },
}));
