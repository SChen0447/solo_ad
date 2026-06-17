import { create } from 'zustand';
import type { IconStoreState, IconConfig, Scheme, CanvasBgType } from '@/types';
import { DEFAULT_ICON_CONFIG } from '@/types';
import { generateId } from '@/utils/exportUtils';

export const useIconStore = create<IconStoreState>((set) => ({
  currentConfig: { ...DEFAULT_ICON_CONFIG, id: generateId() },
  iconCollection: [],
  selectedIconId: null,
  canvasBg: 'transparent',
  schemes: [],
  toast: null,

  setCurrentConfig: (config: Partial<IconConfig>) =>
    set((state) => ({
      currentConfig: { ...state.currentConfig, ...config },
    })),

  addToCollection: (icon: IconConfig) =>
    set((state) => ({
      iconCollection: [...state.iconCollection, { ...icon, id: generateId() }],
    })),

  removeFromCollection: (id: string) =>
    set((state) => ({
      iconCollection: state.iconCollection.filter((icon) => icon.id !== id),
      selectedIconId: state.selectedIconId === id ? null : state.selectedIconId,
    })),

  selectIcon: (id: string | null) =>
    set((state) => {
      if (!id) {
        return {
          selectedIconId: null,
          currentConfig: { ...DEFAULT_ICON_CONFIG, id: generateId() },
        };
      }
      const icon = state.iconCollection.find((i) => i.id === id);
      return {
        selectedIconId: id,
        currentConfig: icon ? { ...icon } : state.currentConfig,
      };
    }),

  setCanvasBg: (bg: CanvasBgType) => set({ canvasBg: bg }),

  setSchemes: (schemes: Scheme[]) => set({ schemes }),

  loadScheme: (scheme: Scheme) =>
    set({
      iconCollection: scheme.icons,
      selectedIconId: null,
      currentConfig: { ...DEFAULT_ICON_CONFIG, id: generateId() },
    }),

  showToast: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  hideToast: () => set({ toast: null }),

  resetCurrentConfig: () =>
    set({
      currentConfig: { ...DEFAULT_ICON_CONFIG, id: generateId(), name: `icon-${Date.now()}` },
      selectedIconId: null,
    }),
}));
