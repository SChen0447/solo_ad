export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface Swatch {
  id: string;
  name: 'primary' | 'primary-dark' | 'primary-light' | 'accent' | 'background';
  label: string;
  hsl: HSL;
  hex: string;
}

export type SceneMode = 'web' | 'poster' | 'interior';
export type PageMode = 'wheel' | 'scheme' | 'preset';

export interface Preset {
  id: string;
  name: string;
  primary: HSL;
}

export interface ColorStore {
  primaryColor: HSL;
  swatches: Swatch[];
  sceneMode: SceneMode;
  pageMode: PageMode;
  presets: Preset[];
  setPrimaryColor: (hsl: HSL) => void;
  updateSwatch: (id: string, hsl: HSL) => void;
  setSceneMode: (mode: SceneMode) => void;
  setPageMode: (mode: PageMode) => void;
  applyPreset: (presetId: string) => void;
  randomPreset: () => void;
}
