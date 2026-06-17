import { create } from 'zustand';
import { generateColorScale } from '../utils/colorUtils';

export type ColorRole = '主色' | '辅色' | '强调色' | '中性色';

export interface CoreColor {
  id: string;
  role: ColorRole;
  hex: string;
  scale: string[];
  expanded: boolean;
}

export interface SelectedColor {
  coreId: string | null;
  scaleIndex: number | null;
  hex: string | null;
}

interface ColorStore {
  projectName: string;
  projectCount: number;
  coreColors: CoreColor[];
  selected: SelectedColor;
  expandedColors: Record<string, boolean>;
  setProjectName: (name: string) => void;
  addCoreColor: (role: ColorRole, hex: string) => void;
  removeCoreColor: (id: string) => void;
  toggleColorExpanded: (id: string) => void;
  setSelectedColor: (coreId: string, scaleIndex: number) => void;
  clearSelectedColor: () => void;
}

const ROLE_ORDER: ColorRole[] = ['主色', '辅色', '强调色', '中性色'];

const DEFAULT_COLORS: Array<{ role: ColorRole; hex: string }> = [
  { role: '主色', hex: '#3B82F6' },
  { role: '辅色', hex: '#8B5CF6' },
  { role: '强调色', hex: '#F59E0B' },
  { role: '中性色', hex: '#6B7280' },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export const useColorStore = create<ColorStore>((set, get) => ({
  projectName: '我的品牌项目',
  projectCount: 1,
  coreColors: DEFAULT_COLORS.map((c) => ({
    id: generateId(),
    role: c.role,
    hex: c.hex,
    scale: generateColorScale(c.hex),
    expanded: false,
  })),
  selected: {
    coreId: null,
    scaleIndex: null,
    hex: null,
  },
  expandedColors: {},

  setProjectName: (name: string) => {
    set({ projectName: name.slice(0, 20) });
  },

  addCoreColor: (role: ColorRole, hex: string) => {
    const state = get();
    const existingIndex = state.coreColors.findIndex((c) => c.role === role);
    const newColor: CoreColor = {
      id: generateId(),
      role,
      hex: hex.toUpperCase(),
      scale: generateColorScale(hex),
      expanded: false,
    };

    if (existingIndex >= 0) {
      const newColors = [...state.coreColors];
      newColors[existingIndex] = newColor;
      set({ coreColors: newColors });
    } else {
      const newColors = [...state.coreColors, newColor];
      newColors.sort(
        (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
      );
      set({ coreColors: newColors });
    }
  },

  removeCoreColor: (id: string) => {
    const state = get();
    const newColors = state.coreColors.filter((c) => c.id !== id);
    const newSelected = { ...state.selected };
    if (state.selected.coreId === id) {
      newSelected.coreId = null;
      newSelected.scaleIndex = null;
      newSelected.hex = null;
    }
    set({ coreColors: newColors, selected: newSelected });
  },

  toggleColorExpanded: (id: string) => {
    const state = get();
    const newColors = state.coreColors.map((c) =>
      c.id === id ? { ...c, expanded: !c.expanded } : c
    );
    set({ coreColors: newColors });
  },

  setSelectedColor: (coreId: string, scaleIndex: number) => {
    const state = get();
    const coreColor = state.coreColors.find((c) => c.id === coreId);
    if (coreColor && scaleIndex >= 0 && scaleIndex < coreColor.scale.length) {
      set({
        selected: {
          coreId,
          scaleIndex,
          hex: coreColor.scale[scaleIndex],
        },
      });
    }
  },

  clearSelectedColor: () => {
    set({
      selected: {
        coreId: null,
        scaleIndex: null,
        hex: null,
      },
    });
  },
}));

export function getAvailableRoles(colors: CoreColor[]): ColorRole[] {
  const usedRoles = new Set(colors.map((c) => c.role));
  return ROLE_ORDER.filter((r) => !usedRoles.has(r));
}

export const SCALE_LABELS = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
