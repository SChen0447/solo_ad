import { create } from 'zustand';
import { TypesetParams, FontData, PreviewColumn, DEFAULT_PARAMS, PRESET_FONTS } from './types';

interface AppState {
  testText: string;
  currentFont: FontData;
  typesetParams: TypesetParams[];
  activeParamsId: string;
  columns: PreviewColumn[];
  isFontLoading: boolean;
  fontLoadingProgress: number;
  selectedColumnId: string | null;

  setTestText: (text: string) => void;
  setCurrentFont: (font: FontData) => void;
  setFontLoading: (loading: boolean, progress?: number) => void;
  updateActiveParams: (params: Partial<TypesetParams>) => void;
  setActiveParamsId: (id: string) => void;
  addColumn: () => void;
  removeColumn: (id: string) => void;
  selectColumn: (id: string) => void;
  updateColumnParams: (columnId: string, paramsId: string) => void;
  duplicateParams: (paramsId: string) => string;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const createDefaultParams = (): TypesetParams => ({
  id: generateId(),
  ...DEFAULT_PARAMS,
});

const initialParams = createDefaultParams();
const initialColumnId = generateId();

export const useAppStore = create<AppState>((set, get) => ({
  testText: 'The quick brown fox jumps over the lazy dog 1234567890',
  currentFont: {
    name: PRESET_FONTS[0].name,
    buffer: null,
    fontUrl: PRESET_FONTS[0].url,
    family: PRESET_FONTS[0].family,
    isCustom: false,
  },
  typesetParams: [initialParams],
  activeParamsId: initialParams.id,
  columns: [
    {
      id: initialColumnId,
      paramsId: initialParams.id,
      isActive: true,
    },
  ],
  isFontLoading: false,
  fontLoadingProgress: 0,
  selectedColumnId: initialColumnId,

  setTestText: (text) => set({ testText: text }),

  setCurrentFont: (font) => set({ currentFont: font }),

  setFontLoading: (loading, progress = 0) =>
    set({ isFontLoading: loading, fontLoadingProgress: progress }),

  updateActiveParams: (params) =>
    set((state) => ({
      typesetParams: state.typesetParams.map((p) =>
        p.id === state.activeParamsId ? { ...p, ...params } : p
      ),
    })),

  setActiveParamsId: (id) => set({ activeParamsId: id }),

  addColumn: () =>
    set((state) => {
      if (state.columns.length >= 4) return state;
      const newParams = { ...get().typesetParams[0], id: generateId() };
      const newColumn: PreviewColumn = {
        id: generateId(),
        paramsId: newParams.id,
        isActive: false,
      };
      return {
        columns: [...state.columns, newColumn],
        typesetParams: [...state.typesetParams, newParams],
        selectedColumnId: newColumn.id,
      };
    }),

  removeColumn: (id) =>
    set((state) => {
      if (state.columns.length <= 1) return state;
      const column = state.columns.find((c) => c.id === id);
      const remainingColumns = state.columns.filter((c) => c.id !== id);
      const remainingParams = state.typesetParams.filter(
        (p) => p.id !== column?.paramsId || state.columns.filter((c) => c.paramsId === p.id).length > 1
      );
      const newSelected = remainingColumns[remainingColumns.length - 1]?.id || null;
      return {
        columns: remainingColumns,
        typesetParams: remainingParams,
        selectedColumnId: newSelected,
        activeParamsId: remainingColumns.find((c) => c.id === newSelected)?.paramsId || state.activeParamsId,
      };
    }),

  selectColumn: (id) =>
    set((state) => {
      const column = state.columns.find((c) => c.id === id);
      if (!column) return state;
      return {
        selectedColumnId: id,
        activeParamsId: column.paramsId,
        columns: state.columns.map((c) => ({
          ...c,
          isActive: c.id === id,
        })),
      };
    }),

  updateColumnParams: (columnId, paramsId) =>
    set((state) => ({
      columns: state.columns.map((c) =>
        c.id === columnId ? { ...c, paramsId } : c
      ),
    })),

  duplicateParams: (paramsId) => {
    const sourceParams = get().typesetParams.find((p) => p.id === paramsId);
    if (!sourceParams) return paramsId;
    const newParams = { ...sourceParams, id: generateId() };
    set((state) => ({
      typesetParams: [...state.typesetParams, newParams],
    }));
    return newParams.id;
  },
}));
