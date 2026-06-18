import { create } from 'zustand';
import { generatePalette, applySyncRules, hslObjToHex } from '../utils/colorUtils';
import type { ColorStore, HSL, SceneMode, PageMode, Preset, Swatch } from '../types';

const PRESETS: Preset[] = [
  { id: '1', name: '莫兰迪蓝', primary: { h: 210, s: 25, l: 45 } },
  { id: '2', name: '复古暖橙', primary: { h: 30, s: 70, l: 55 } },
  { id: '3', name: '森林之绿', primary: { h: 140, s: 45, l: 35 } },
  { id: '4', name: '优雅紫罗兰', primary: { h: 270, s: 40, l: 50 } },
  { id: '5', name: '珊瑚红', primary: { h: 5, s: 75, l: 60 } },
];

const initialPrimary: HSL = { h: 210, s: 70, l: 50 };

export const useColorStore = create<ColorStore>((set, get) => ({
  primaryColor: initialPrimary,
  swatches: generatePalette(initialPrimary),
  sceneMode: 'web',
  pageMode: 'wheel',
  presets: PRESETS,

  setPrimaryColor: (hsl: HSL) => {
    set({
      primaryColor: hsl,
      swatches: generatePalette(hsl),
    });
  },

  updateSwatch: (id: string, hsl: HSL) => {
    const { swatches } = get();
    const updatedSwatches = applySyncRules(swatches, id, hsl) as Swatch[];
    
    if (id === 'primary') {
      const primarySwatch = updatedSwatches.find(s => s.id === 'primary');
      if (primarySwatch) {
        set({
          primaryColor: hsl,
          swatches: updatedSwatches,
        });
        return;
      }
    }
    
    const updatedWithHex = updatedSwatches.map(s => ({
      ...s,
      hex: hslObjToHex(s.hsl),
    }));
    set({ swatches: updatedWithHex });
  },

  setSceneMode: (mode: SceneMode) => set({ sceneMode: mode }),
  setPageMode: (mode: PageMode) => set({ pageMode: mode }),

  applyPreset: (presetId: string) => {
    const preset = get().presets.find(p => p.id === presetId);
    if (preset) {
      get().setPrimaryColor(preset.primary);
    }
  },

  randomPreset: () => {
    const presets = get().presets;
    const random = presets[Math.floor(Math.random() * presets.length)];
    get().setPrimaryColor(random.primary);
  },
}));
