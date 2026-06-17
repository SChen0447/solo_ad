import { create } from 'zustand';
import {
  TransformState,
  TransformParams,
  ModelPreset,
  DEFAULT_PARAMS,
  computeCombinedMatrix,
} from '../types';

export const useTransformStore = create<TransformState>((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  combinedMatrix: computeCombinedMatrix(DEFAULT_PARAMS),
  activeModel: ModelPreset.Cube,
  showMatrix: true,

  setParams: (partial: Partial<TransformParams>) => {
    const current = get().params;
    const next = { ...current, ...partial };
    set({
      params: next,
      combinedMatrix: computeCombinedMatrix(next),
    });
  },

  setActiveModel: (model: ModelPreset) => {
    set({ activeModel: model });
  },

  toggleMatrix: () => {
    set((s) => ({ showMatrix: !s.showMatrix }));
  },
}));
