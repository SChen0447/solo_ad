import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getContrastColor } from '@/utils/colorUtils';

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  createdAt: number;
}

interface ThemeState {
  schemes: ColorScheme[];
  currentScheme: ColorScheme | null;
  selectedForCompare: string[];
  isCompareMode: boolean;
  showExportModal: boolean;
  exportSchemeId: string | null;
  editingColor: 'primary' | 'secondary' | 'background';
  tempColors: {
    primary: string;
    secondary: string;
    background: string;
  };
}

interface ThemeActions {
  addScheme: (scheme: Omit<ColorScheme, 'id' | 'createdAt' | 'text'>) => void;
  updateScheme: (id: string, updates: Partial<ColorScheme>) => void;
  deleteScheme: (id: string) => void;
  selectScheme: (id: string) => void;
  toggleCompare: (id: string) => void;
  setCompareMode: (enabled: boolean) => void;
  setShowExportModal: (show: boolean, schemeId?: string) => void;
  setEditingColor: (color: 'primary' | 'secondary' | 'background') => void;
  setTempColor: (
    colorType: 'primary' | 'secondary' | 'background',
    value: string
  ) => void;
  applyTempColorsToScheme: (id: string) => void;
  exportCSS: (scheme: ColorScheme) => string;
  copyToClipboard: (text: string) => Promise<boolean>;
  resetTempColors: () => void;
}

const defaultTempColors = {
  primary: '#3b82f6',
  secondary: '#10b981',
  background: '#ffffff',
};

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      schemes: [],
      currentScheme: null,
      selectedForCompare: [],
      isCompareMode: false,
      showExportModal: false,
      exportSchemeId: null,
      editingColor: 'primary',
      tempColors: { ...defaultTempColors },

      addScheme: (scheme) => {
        const newScheme: ColorScheme = {
          ...scheme,
          id: generateId(),
          createdAt: Date.now(),
          text: getContrastColor(scheme.background),
        };
        set((state) => ({
          schemes: [...state.schemes, newScheme],
          currentScheme: newScheme,
        }));
      },

      updateScheme: (id, updates) => {
        set((state) => ({
          schemes: state.schemes.map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...updates,
                  text: updates.background
                    ? getContrastColor(updates.background)
                    : s.text,
                }
              : s
          ),
          currentScheme:
            state.currentScheme?.id === id
              ? {
                  ...state.currentScheme,
                  ...updates,
                  text: updates.background
                    ? getContrastColor(updates.background)
                    : state.currentScheme.text,
                }
              : state.currentScheme,
        }));
      },

      deleteScheme: (id) => {
        set((state) => {
          const newSchemes = state.schemes.filter((s) => s.id !== id);
          return {
            schemes: newSchemes,
            currentScheme:
              state.currentScheme?.id === id
                ? newSchemes[newSchemes.length - 1] || null
                : state.currentScheme,
            selectedForCompare: state.selectedForCompare.filter(
              (sid) => sid !== id
            ),
          };
        });
      },

      selectScheme: (id) => {
        const scheme = get().schemes.find((s) => s.id === id);
        if (scheme) {
          set({
            currentScheme: scheme,
            tempColors: {
              primary: scheme.primary,
              secondary: scheme.secondary,
              background: scheme.background,
            },
          });
        }
      },

      toggleCompare: (id) => {
        set((state) => {
          const isSelected = state.selectedForCompare.includes(id);
          let newSelected: string[];
          if (isSelected) {
            newSelected = state.selectedForCompare.filter((sid) => sid !== id);
          } else {
            newSelected = [...state.selectedForCompare, id].slice(-2);
          }
          return {
            selectedForCompare: newSelected,
            isCompareMode: newSelected.length === 2,
          };
        });
      },

      setCompareMode: (enabled) => {
        set({ isCompareMode: enabled });
      },

      setShowExportModal: (show, schemeId) => {
        set({
          showExportModal: show,
          exportSchemeId: schemeId || null,
        });
      },

      setEditingColor: (color) => {
        set({ editingColor: color });
      },

      setTempColor: (colorType, value) => {
        set((state) => ({
          tempColors: {
            ...state.tempColors,
            [colorType]: value,
          },
        }));
      },

      applyTempColorsToScheme: (id) => {
        const { tempColors } = get();
        get().updateScheme(id, tempColors);
      },

      exportCSS: (scheme) => {
        return `:root {
  --primary: ${scheme.primary};
  --secondary: ${scheme.secondary};
  --background: ${scheme.background};
  --text: ${scheme.text};
}`;
      },

      copyToClipboard: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          return false;
        }
      },

      resetTempColors: () => {
        const { currentScheme } = get();
        if (currentScheme) {
          set({
            tempColors: {
              primary: currentScheme.primary,
              secondary: currentScheme.secondary,
              background: currentScheme.background,
            },
          });
        } else {
          set({ tempColors: { ...defaultTempColors } });
        }
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        schemes: state.schemes,
        currentScheme: state.currentScheme,
      }),
    }
  )
);
