import { create } from 'zustand';
import type { Slots, SlotState, Ingredient, ShakeState, BrewResult } from './types';

interface PotionStore {
  slots: Slots;
  setSlot: (idx: 0 | 1 | 2, ing: SlotState) => void;
  clearSlots: () => void;
  shakeState: ShakeState;
  setShaking: (v: boolean) => void;
  addShakeDuration: (ms: number) => void;
  addParticleCount: (n: number) => void;
  resetShake: () => void;
  lastResult: BrewResult | null;
  setLastResult: (r: BrewResult | null) => void;
  highlightedRecipeId: string | null;
  setHighlighted: (id: string | null) => void;
  flashColor: string | null;
  setFlashColor: (c: string | null) => void;
}

export const usePotionStore = create<PotionStore>((set, get) => ({
  slots: [null, null, null],
  setSlot: (idx: 0 | 1 | 2, ing: Ingredient | null) =>
    set(state => {
      const next = [...state.slots] as Slots;
      next[idx] = ing;
      return { slots: next };
    }),
  clearSlots: () => set({ slots: [null, null, null], lastResult: null }),
  shakeState: { isShaking: false, durationMs: 0, particleCount: 0 },
  setShaking: (v: boolean) =>
    set(state => ({ shakeState: { ...state.shakeState, isShaking: v } })),
  addShakeDuration: (ms: number) =>
    set(state => ({
      shakeState: {
        ...state.shakeState,
        durationMs: Math.min(6000, state.shakeState.durationMs + ms),
      },
    })),
  addParticleCount: (n: number) =>
    set(state => ({
      shakeState: {
        ...state.shakeState,
        particleCount: Math.min(500, state.shakeState.particleCount + n),
      },
    })),
  resetShake: () =>
    set({ shakeState: { isShaking: false, durationMs: 0, particleCount: 0 } }),
  lastResult: null,
  setLastResult: (r: BrewResult | null) => set({ lastResult: r }),
  highlightedRecipeId: null,
  setHighlighted: (id: string | null) => set({ highlightedRecipeId: id }),
  flashColor: null,
  setFlashColor: (c: string | null) => set({ flashColor: c }),
}));
