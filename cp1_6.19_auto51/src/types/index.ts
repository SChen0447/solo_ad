import * as THREE from 'three';

export type ParticleState = 'alive' | 'dying' | 'dead';

export type SizeCurve = 'linear' | 'growShrink' | 'shrinkGrow';

export type PresetMode = 'default' | 'fire' | 'smoke' | 'dust';

export interface ParticleData {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  startColor: THREE.Color;
  endColor: THREE.Color;
  size: number;
  startSize: number;
  endSize: number;
  life: number;
  maxLife: number;
  state: ParticleState;
  trail: THREE.Vector3[];
  rotation: number;
  rotationSpeed: number;
}

export interface EmitterConfig {
  position: THREE.Vector3;
  emissionRate: number;
  initialSpeed: number;
  lifetime: number;
  startColor: string;
  endColor: string;
  sizeCurve: SizeCurve;
  trailLength: number;
  particleRadius: number;
}

export interface PresetBehavior {
  gravity?: number;
  upwardForce?: number;
  spin?: boolean;
  colorStops?: { position: number; color: string }[];
}

export interface PresetConfig {
  name: string;
  icon: string;
  config: Partial<EmitterConfig>;
  behavior: PresetBehavior;
}

export interface UIState {
  panelPosition: { x: number; y: number };
  collapsedSections: {
    particleParams: boolean;
    colorSettings: boolean;
    presets: boolean;
  };
  currentMode: PresetMode;
  isTransitioning: boolean;
}

export interface ParticleStore {
  emitterConfig: EmitterConfig;
  presetBehavior: PresetBehavior;
  uiState: UIState;
  emitterPosition: THREE.Vector3;
  maxParticles: number;
  setEmitterConfig: (config: Partial<EmitterConfig>) => void;
  setPresetBehavior: (behavior: PresetBehavior) => void;
  setEmitterPosition: (position: THREE.Vector3) => void;
  setCurrentMode: (mode: PresetMode) => void;
  setIsTransitioning: (value: boolean) => void;
  setPanelPosition: (pos: { x: number; y: number }) => void;
  toggleSection: (section: keyof UIState['collapsedSections']) => void;
  applyPreset: (mode: PresetMode) => void;
}

export const SIZE_CURVE_LABELS: Record<SizeCurve, string> = {
  linear: '线性缩小',
  growShrink: '先大后小',
  shrinkGrow: '先小后大',
};
