import { create } from 'zustand';

export type OperationType = 'water' | 'light' | 'fertilizer';

export interface StageInfo {
  name: string;
  requiredOperations: number;
}

export const STAGES: StageInfo[] = [
  { name: '种子萌芽', requiredOperations: 3 },
  { name: '嫩苗初长', requiredOperations: 6 },
  { name: '茎叶茁壮', requiredOperations: 10 },
  { name: '含苞待放', requiredOperations: 15 },
  { name: '繁花盛开', requiredOperations: 20 },
  { name: '硕果累累', requiredOperations: 25 },
];

const COOLDOWN_DURATION = 3000;
const OPERATION_VALUE = 20;

interface Cooldowns {
  water: number;
  light: number;
  fertilizer: number;
}

interface PlantStore {
  stage: number;
  operations: number;
  water: number;
  light: number;
  fertilizer: number;
  cooldowns: Cooldowns;
  isUpgrading: boolean;
  performOperation: (type: OperationType) => void;
  isOnCooldown: (type: OperationType) => boolean;
  getCooldownProgress: (type: OperationType) => number;
  triggerUpgrade: () => void;
}

export const usePlantStore = create<PlantStore>((set, get) => ({
  stage: 0,
  operations: 0,
  water: 30,
  light: 30,
  fertilizer: 30,
  cooldowns: { water: 0, light: 0, fertilizer: 0 },
  isUpgrading: false,

  performOperation: (type: OperationType) => {
    const state = get();
    if (state.isOnCooldown(type)) return;
    if (state.isUpgrading) return;

    const now = Date.now();
    const newCooldowns = { ...state.cooldowns, [type]: now };

    const currentValue = state[type];
    const newValue = Math.min(100, currentValue + OPERATION_VALUE);

    const newOperations = state.operations + 1;
    const currentStage = STAGES[state.stage];
    const shouldUpgrade =
      state.stage < STAGES.length - 1 && newOperations >= currentStage.requiredOperations;

    if (shouldUpgrade) {
      set({
        [type]: newValue,
        cooldowns: newCooldowns,
        operations: 0,
        isUpgrading: true,
      } as Partial<PlantStore>);

      setTimeout(() => {
        set((s) => ({
          stage: s.stage + 1,
          isUpgrading: false,
        }));
      }, 600);
    } else {
      set({
        [type]: newValue,
        cooldowns: newCooldowns,
        operations: newOperations,
      } as Partial<PlantStore>);
    }
  },

  isOnCooldown: (type: OperationType) => {
    const state = get();
    return Date.now() - state.cooldowns[type] < COOLDOWN_DURATION;
  },

  getCooldownProgress: (type: OperationType) => {
    const state = get();
    const elapsed = Date.now() - state.cooldowns[type];
    if (elapsed >= COOLDOWN_DURATION) return 1;
    return elapsed / COOLDOWN_DURATION;
  },

  triggerUpgrade: () => {
    set({ isUpgrading: true });
    setTimeout(() => {
      set((s) => ({
        stage: Math.min(s.stage + 1, STAGES.length - 1),
        isUpgrading: false,
      }));
    }, 600);
  },
}));
