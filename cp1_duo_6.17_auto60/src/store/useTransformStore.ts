import { createStore } from 'zustand/vanilla';
import {
  TransformState,
  TransformParams,
  ModelPreset,
  DEFAULT_PARAMS,
  PARAM_CONFIG,
  computeCombinedMatrix,
} from '../types';

function clampParams(params: TransformParams): TransformParams {
  return {
    translateX: Math.max(PARAM_CONFIG.translateX.min, Math.min(PARAM_CONFIG.translateX.max, params.translateX)),
    rotateY: Math.max(PARAM_CONFIG.rotateY.min, Math.min(PARAM_CONFIG.rotateY.max, params.rotateY)),
    scale: Math.max(PARAM_CONFIG.scale.min, Math.min(PARAM_CONFIG.scale.max, params.scale)),
    shearX: Math.max(PARAM_CONFIG.shearX.min, Math.min(PARAM_CONFIG.shearX.max, params.shearX)),
  };
}

export const transformStore = createStore<TransformState>()((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  combinedMatrix: computeCombinedMatrix(DEFAULT_PARAMS),
  activeModel: ModelPreset.Cube,
  showMatrix: true,

  setParams: (partial: Partial<TransformParams>) => {
    const current = get().params;
    const next = clampParams({ ...current, ...partial });
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
