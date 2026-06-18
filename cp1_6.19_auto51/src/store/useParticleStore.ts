import { create } from 'zustand';
import * as THREE from 'three';
import { ParticleStore, PresetMode, EmitterConfig, UIState } from '@/types';
import { DEFAULT_EMITTER_CONFIG, PRESET_CONFIGS } from '@/utils/presets';

const initialUIState: UIState = {
  panelPosition: { x: 20, y: 20 },
  collapsedSections: {
    particleParams: false,
    colorSettings: false,
    presets: false,
  },
  currentMode: 'default',
  isTransitioning: false,
};

export const useParticleStore = create<ParticleStore>((set, get) => ({
  emitterConfig: { ...DEFAULT_EMITTER_CONFIG },
  presetBehavior: {},
  uiState: initialUIState,
  emitterPosition: new THREE.Vector3(0, 0, 0),
  maxParticles: 5000,

  setEmitterConfig: (config: Partial<EmitterConfig>) =>
    set((state) => ({
      emitterConfig: { ...state.emitterConfig, ...config },
    })),

  setPresetBehavior: (behavior) =>
    set(() => ({
      presetBehavior: behavior,
    })),

  setEmitterPosition: (position) =>
    set(() => ({
      emitterPosition: position.clone(),
      emitterConfig: {
        ...get().emitterConfig,
        position: position.clone(),
      },
    })),

  setCurrentMode: (mode: PresetMode) =>
    set((state) => ({
      uiState: { ...state.uiState, currentMode: mode },
    })),

  setIsTransitioning: (value: boolean) =>
    set((state) => ({
      uiState: { ...state.uiState, isTransitioning: value },
    })),

  setPanelPosition: (pos) =>
    set((state) => ({
      uiState: { ...state.uiState, panelPosition: pos },
    })),

  toggleSection: (section) =>
    set((state) => ({
      uiState: {
        ...state.uiState,
        collapsedSections: {
          ...state.uiState.collapsedSections,
          [section]: !state.uiState.collapsedSections[section],
        },
      },
    })),

  applyPreset: (mode: PresetMode) => {
    const preset = PRESET_CONFIGS[mode];
    if (!preset) return;

    const currentConfig = get().emitterConfig;
    const startConfig = { ...currentConfig };
    const startBehavior = { ...get().presetBehavior };
    const targetConfig = { ...currentConfig, ...preset.config };
    const targetBehavior = { ...preset.behavior };

    set((state) => ({
      uiState: { ...state.uiState, currentMode: mode, isTransitioning: true },
    }));

    const transitionDuration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / transitionDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const lerpColor = (c1: string, c2: string, t: number): string => {
        const col1 = new THREE.Color(c1);
        const col2 = new THREE.Color(c2);
        const r = lerp(col1.r, col2.r, t);
        const g = lerp(col1.g, col2.g, t);
        const b = lerp(col1.b, col2.b, t);
        return `#${new THREE.Color(r, g, b).getHexString()}`;
      };

      set({
        emitterConfig: {
          ...currentConfig,
          emissionRate: lerp(startConfig.emissionRate, targetConfig.emissionRate || startConfig.emissionRate, eased),
          initialSpeed: lerp(startConfig.initialSpeed, targetConfig.initialSpeed || startConfig.initialSpeed, eased),
          lifetime: lerp(startConfig.lifetime, targetConfig.lifetime || startConfig.lifetime, eased),
          startColor: lerpColor(startConfig.startColor, targetConfig.startColor || startConfig.startColor, eased),
          endColor: lerpColor(startConfig.endColor, targetConfig.endColor || startConfig.endColor, eased),
          sizeCurve: targetConfig.sizeCurve || startConfig.sizeCurve,
          trailLength: targetConfig.trailLength ?? startConfig.trailLength,
          particleRadius: targetConfig.particleRadius ?? startConfig.particleRadius,
        },
        presetBehavior: eased > 0.5 ? targetBehavior : startBehavior,
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        set((state) => ({
          uiState: { ...state.uiState, isTransitioning: false },
          emitterConfig: targetConfig,
          presetBehavior: targetBehavior,
        }));
      }
    };

    requestAnimationFrame(animate);
  },
}));
