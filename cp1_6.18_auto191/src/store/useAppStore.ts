import { create } from 'zustand';
import {
  AppState,
  WheelParams,
  CameraState,
  ComparisonSide,
  DEFAULT_CAMERA_STATE,
  DEFAULT_WHEEL_PARAMS,
} from '../types';

export const useAppStore = create<AppState>((set, get) => ({
  selectedCarId: 'car1',
  leftWheelParams: { ...DEFAULT_WHEEL_PARAMS },
  rightWheelParams: { ...DEFAULT_WHEEL_PARAMS, wheelId: 'wheel2' },
  wheelHistory: ['wheel1'],
  comparisonMode: false,
  cameraState: { ...DEFAULT_CAMERA_STATE },
  loadingWheels: new Set<string>(),
  activeSide: 'single',

  setWheelParams: (side: 'left' | 'right', params: Partial<WheelParams>) => {
    const key = side === 'left' ? 'leftWheelParams' : 'rightWheelParams';
    set((state) => ({
      [key]: { ...state[key], ...params },
    }));
  },

  selectWheel: (wheelId: string) => {
    const state = get();
    const currentWheelId = state.leftWheelParams.wheelId;
    
    if (currentWheelId === wheelId) return;

    const newHistory = [...state.wheelHistory, currentWheelId].slice(-5);
    const previousWheelId = newHistory[newHistory.length - 1] || 'wheel1';

    set({
      leftWheelParams: { ...state.leftWheelParams, wheelId },
      rightWheelParams: { ...state.rightWheelParams, wheelId: previousWheelId },
      wheelHistory: newHistory,
    });
  },

  setColor: (color: string) => {
    const state = get();
    set({
      leftWheelParams: { ...state.leftWheelParams, color },
      rightWheelParams: { ...state.rightWheelParams, color },
    });
  },

  setSize: (size: number) => {
    const state = get();
    set({
      leftWheelParams: { ...state.leftWheelParams, size },
      rightWheelParams: { ...state.rightWheelParams, size },
    });
  },

  toggleComparisonMode: () => {
    set((state) => ({
      comparisonMode: !state.comparisonMode,
      activeSide: !state.comparisonMode ? 'left' : 'single',
    }));
  },

  setCameraState: (cameraState: CameraState) => {
    set({ cameraState });
  },

  setWheelLoaded: (wheelId: string, loaded: boolean) => {
    set((state) => {
      const newLoadingWheels = new Set(state.loadingWheels);
      if (loaded) {
        newLoadingWheels.delete(wheelId);
      } else {
        newLoadingWheels.add(wheelId);
      }
      return { loadingWheels: newLoadingWheels };
    });
  },

  setActiveSide: (side: ComparisonSide) => {
    set({ activeSide: side });
  },
}));
