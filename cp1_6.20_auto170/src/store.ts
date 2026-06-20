import { create } from 'zustand';
import {
  PixelPartData,
  Equipment,
  ActionTemplateId,
  ComposeResponse,
  createEmptyParts,
} from '@/types';

interface AppState {
  parts: PixelPartData;
  selectedColor: number;
  isEraser: boolean;
  selectedEquipmentIds: string[];
  equipments: Equipment[];
  currentAction: ActionTemplateId;
  composeResult: ComposeResponse | null;
  isComposing: boolean;
  isExporting: boolean;
  characterName: string;

  setPixel: (part: keyof PixelPartData, row: number, col: number, colorIdx: number) => void;
  setSelectedColor: (idx: number) => void;
  setIsEraser: (v: boolean) => void;
  toggleEquipment: (id: string) => void;
  setEquipments: (eq: Equipment[]) => void;
  setCurrentAction: (a: ActionTemplateId) => void;
  setComposeResult: (r: ComposeResponse | null) => void;
  setIsComposing: (v: boolean) => void;
  setIsExporting: (v: boolean) => void;
  setCharacterName: (n: string) => void;
  getMergedParts: () => PixelPartData;
}

function mergeOverlay(base: number[][], overlay: number[][]): number[][] {
  const result = base.map(row => [...row]);
  for (let r = 0; r < Math.min(overlay.length, 16); r++) {
    for (let c = 0; c < Math.min(overlay[r].length, 16); c++) {
      if (overlay[r][c] >= 0) {
        result[r][c] = overlay[r][c];
      }
    }
  }
  return result;
}

export const useAppStore = create<AppState>((set, get) => ({
  parts: createEmptyParts(),
  selectedColor: 0,
  isEraser: false,
  selectedEquipmentIds: [],
  equipments: [],
  currentAction: 'idle',
  composeResult: null,
  isComposing: false,
  isExporting: false,
  characterName: '勇者',

  setPixel: (part, row, col, colorIdx) =>
    set(state => {
      const newParts = { ...state.parts };
      const newGrid = state.parts[part].map(r => [...r]);
      newGrid[row][col] = colorIdx;
      newParts[part] = newGrid;
      return { parts: newParts };
    }),

  setSelectedColor: idx => set({ selectedColor: idx, isEraser: false }),
  setIsEraser: v => set({ isEraser: v }),
  toggleEquipment: id =>
    set(state => {
      const ids = state.selectedEquipmentIds;
      return {
        selectedEquipmentIds: ids.includes(id)
          ? ids.filter(i => i !== id)
          : [...ids, id],
      };
    }),
  setEquipments: eq => set({ equipments: eq }),
  setCurrentAction: a => set({ currentAction: a }),
  setComposeResult: r => set({ composeResult: r }),
  setIsComposing: v => set({ isComposing: v }),
  setIsExporting: v => set({ isExporting: v }),
  setCharacterName: n => set({ characterName: n }),

  getMergedParts: () => {
    const { parts, equipments, selectedEquipmentIds } = get();
    const merged = { ...parts };
    for (const eq of equipments) {
      if (!selectedEquipmentIds.includes(eq.id)) continue;
      for (const overlay of eq.frameOverlayData) {
        const target = overlay.targetPart as keyof PixelPartData;
        if (target in merged) {
          merged[target] = mergeOverlay(merged[target], overlay.pixels);
        }
      }
    }
    return merged;
  },
}));
