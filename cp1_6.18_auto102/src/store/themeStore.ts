import { create } from 'zustand';
import { ColorLevel, ColorVariants, generateVariants } from '../utils/colorUtils';

export type ColorCategory = 'primary' | 'secondary' | 'background' | 'text';

export interface ColorEntry {
  id: string;
  name: string;
  category: ColorCategory;
  baseColor: string;
  variants: ColorVariants;
}

export interface ThemeScheme {
  id: string;
  name: string;
  createdAt: number;
  colors: ColorEntry[];
}

interface ThemeState {
  currentScheme: ThemeScheme;
  schemes: ThemeScheme[];
  selectedColorId: string | null;
  selectedVariantLevel: ColorLevel | null;
  isDarkPreview: boolean;
  showExportModal: boolean;
  copiedColorKey: string | null;

  updateBaseColor: (colorId: string, hex: string) => void;
  updateVariant: (colorId: string, level: ColorLevel, hex: string) => void;
  selectColor: (colorId: string | null) => void;
  selectVariant: (level: ColorLevel | null) => void;
  togglePreviewMode: () => void;
  saveScheme: (name: string) => void;
  loadScheme: (schemeId: string) => void;
  reorderSchemes: (fromIndex: number, toIndex: number) => void;
  deleteScheme: (schemeId: string) => void;
  toggleExportModal: () => void;
  setCopiedColorKey: (key: string | null) => void;
  exportCSS: () => string;
  exportJSON: () => string;
}

const PRESET_COLORS = [
  { id: 'primary', name: '主色', hex: '#6366f1', category: 'primary' as ColorCategory },
  { id: 'secondary', name: '辅助色', hex: '#22d3ee', category: 'secondary' as ColorCategory },
  { id: 'background', name: '背景色', hex: '#1e1b4b', category: 'background' as ColorCategory },
  { id: 'surface', name: '表面色', hex: '#312e81', category: 'background' as ColorCategory },
  { id: 'text-primary', name: '主文字', hex: '#f8fafc', category: 'text' as ColorCategory },
  { id: 'text-secondary', name: '次文字', hex: '#94a3b8', category: 'text' as ColorCategory },
  { id: 'accent-1', name: '强调色1', hex: '#f43f5e', category: 'secondary' as ColorCategory },
  { id: 'accent-2', name: '强调色2', hex: '#a78bfa', category: 'secondary' as ColorCategory },
  { id: 'success', name: '成功色', hex: '#4ade80', category: 'secondary' as ColorCategory },
  { id: 'warning', name: '警告色', hex: '#fbbf24', category: 'secondary' as ColorCategory },
];

function createColorEntry(preset: typeof PRESET_COLORS[0]): ColorEntry {
  return {
    id: preset.id,
    name: preset.name,
    category: preset.category,
    baseColor: preset.hex,
    variants: generateVariants(preset.hex)
  };
}

function createInitialScheme(): ThemeScheme {
  return {
    id: `scheme-${Date.now()}`,
    name: '默认方案',
    createdAt: Date.now(),
    colors: PRESET_COLORS.map(createColorEntry)
  };
}

function loadSchemesFromStorage(): ThemeScheme[] {
  try {
    const stored = localStorage.getItem('color-schemes');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveSchemesToStorage(schemes: ThemeScheme[]) {
  try {
    localStorage.setItem('color-schemes', JSON.stringify(schemes));
  } catch {
    // ignore
  }
}

const storedSchemes = loadSchemesFromStorage();
const initialScheme = storedSchemes.length > 0 
  ? storedSchemes[0] 
  : createInitialScheme();

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentScheme: initialScheme,
  schemes: storedSchemes.length > 0 ? storedSchemes : [initialScheme],
  selectedColorId: initialScheme.colors[0].id,
  selectedVariantLevel: null,
  isDarkPreview: true,
  showExportModal: false,
  copiedColorKey: null,

  updateBaseColor: (colorId: string, hex: string) => {
    set((state) => {
      const newColors = state.currentScheme.colors.map((color) =>
        color.id === colorId
          ? { ...color, baseColor: hex, variants: generateVariants(hex) }
          : color
      );
      return {
        currentScheme: { ...state.currentScheme, colors: newColors }
      };
    });
  },

  updateVariant: (colorId: string, level: ColorLevel, hex: string) => {
    set((state) => {
      const newColors = state.currentScheme.colors.map((color) =>
        color.id === colorId
          ? { ...color, variants: { ...color.variants, [level]: hex } }
          : color
      );
      return {
        currentScheme: { ...state.currentScheme, colors: newColors }
      };
    });
  },

  selectColor: (colorId: string | null) => {
    set({ selectedColorId: colorId, selectedVariantLevel: null });
  },

  selectVariant: (level: ColorLevel | null) => {
    set({ selectedVariantLevel: level });
  },

  togglePreviewMode: () => {
    set((state) => ({ isDarkPreview: !state.isDarkPreview }));
  },

  saveScheme: (name: string) => {
    set((state) => {
      const newScheme: ThemeScheme = {
        ...state.currentScheme,
        id: `scheme-${Date.now()}`,
        name,
        createdAt: Date.now()
      };
      const newSchemes = [...state.schemes, newScheme];
      saveSchemesToStorage(newSchemes);
      return {
        schemes: newSchemes,
        currentScheme: newScheme
      };
    });
  },

  loadScheme: (schemeId: string) => {
    set((state) => {
      const scheme = state.schemes.find((s) => s.id === schemeId);
      if (scheme) {
        return {
          currentScheme: scheme,
          selectedColorId: scheme.colors[0].id,
          selectedVariantLevel: null
        };
      }
      return {};
    });
  },

  reorderSchemes: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newSchemes = [...state.schemes];
      const [removed] = newSchemes.splice(fromIndex, 1);
      newSchemes.splice(toIndex, 0, removed);
      saveSchemesToStorage(newSchemes);
      return { schemes: newSchemes };
    });
  },

  deleteScheme: (schemeId: string) => {
    set((state) => {
      const newSchemes = state.schemes.filter((s) => s.id !== schemeId);
      if (newSchemes.length === 0) {
        const newInitial = createInitialScheme();
        newSchemes.push(newInitial);
      }
      saveSchemesToStorage(newSchemes);
      const newCurrent = state.currentScheme.id === schemeId
        ? newSchemes[0]
        : state.currentScheme;
      return {
        schemes: newSchemes,
        currentScheme: newCurrent,
        selectedColorId: newCurrent.colors[0].id
      };
    });
  },

  toggleExportModal: () => {
    set((state) => ({ showExportModal: !state.showExportModal }));
  },

  setCopiedColorKey: (key: string | null) => {
    set({ copiedColorKey: key });
  },

  exportCSS: () => {
    const { currentScheme } = get();
    const lines: string[] = [':root {'];
    
    currentScheme.colors.forEach((color) => {
      Object.entries(color.variants).forEach(([level, value]) => {
        const varName = `--${color.id}-${level}`;
        lines.push(`  ${varName}: ${value};`);
      });
    });

    const primaryColor = currentScheme.colors.find(c => c.id === 'primary');
    if (primaryColor) {
      lines.push('');
      lines.push(`  --primary: ${primaryColor.variants.primary};`);
      lines.push(`  --primary-light: ${primaryColor.variants.light};`);
      lines.push(`  --primary-dark: ${primaryColor.variants.dark};`);
    }

    const secondaryColor = currentScheme.colors.find(c => c.id === 'secondary');
    if (secondaryColor) {
      lines.push(`  --secondary: ${secondaryColor.variants.primary};`);
    }

    const bgColor = currentScheme.colors.find(c => c.id === 'background');
    if (bgColor) {
      lines.push(`  --background: ${bgColor.variants.primary};`);
    }

    const textColor = currentScheme.colors.find(c => c.id === 'text-primary');
    if (textColor) {
      lines.push(`  --text-primary: ${textColor.variants.primary};`);
    }

    lines.push('}');
    return lines.join('\n');
  },

  exportJSON: () => {
    const { currentScheme } = get();
    const exportData = {
      name: currentScheme.name,
      version: '1.0',
      createdAt: new Date(currentScheme.createdAt).toISOString(),
      colors: currentScheme.colors.map((color) => ({
        id: color.id,
        name: color.name,
        category: color.category,
        baseColor: color.baseColor,
        variants: color.variants
      }))
    };
    return JSON.stringify(exportData, null, 2);
  }
}));
