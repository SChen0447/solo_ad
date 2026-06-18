import { create } from 'zustand';
import type {
  SceneElement,
  SunAngle,
  WeatherMode,
  ToolMode,
  ElementType,
  LineOfSightResult,
} from './types';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

interface SandboxState {
  elements: SceneElement[];
  selectedElementId: string | null;
  sunAngle: SunAngle;
  weatherMode: WeatherMode;
  toolMode: ToolMode;
  placingElementType: ElementType | null;
  placingHeight: number;
  previewPosition: { x: number; y: number; z: number } | null;
  isPreviewValid: boolean;
  lineOfSightResult: LineOfSightResult | null;
  lineOfSightStart: { x: number; y: number; z: number } | null;
  isDragging: boolean;
  weatherTransition: number;

  addElement: (element: Omit<SceneElement, 'id'>) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<SceneElement>) => void;
  selectElement: (id: string | null) => void;
  setSunAngle: (angle: Partial<SunAngle>) => void;
  setWeatherMode: (mode: WeatherMode) => void;
  setToolMode: (mode: ToolMode) => void;
  setPlacingElementType: (type: ElementType | null) => void;
  setPlacingHeight: (height: number) => void;
  setPreviewPosition: (
    pos: { x: number; y: number; z: number } | null,
    valid: boolean
  ) => void;
  setLineOfSightResult: (result: LineOfSightResult | null) => void;
  setLineOfSightStart: (
    point: { x: number; y: number; z: number } | null
  ) => void;
  setIsDragging: (dragging: boolean) => void;
  setWeatherTransition: (value: number) => void;
  clearAll: () => void;
}

export const useSandboxStore = create<SandboxState>((set) => ({
  elements: [],
  selectedElementId: null,
  sunAngle: { azimuth: 135, altitude: 45 },
  weatherMode: 'sunny',
  toolMode: 'select',
  placingElementType: null,
  placingHeight: 1,
  previewPosition: null,
  isPreviewValid: false,
  lineOfSightResult: null,
  lineOfSightStart: null,
  isDragging: false,
  weatherTransition: 1,

  addElement: (element) =>
    set((state) => {
      if (state.elements.length >= 50) {
        return state;
      }
      return {
        elements: [...state.elements, { ...element, id: generateId() }],
      };
    }),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  selectElement: (id) => set({ selectedElementId: id }),

  setSunAngle: (angle) =>
    set((state) => ({
      sunAngle: { ...state.sunAngle, ...angle },
    })),

  setWeatherMode: (mode) => set({ weatherMode: mode }),

  setToolMode: (mode) =>
    set({
      toolMode: mode,
      placingElementType: mode !== 'place' ? null : undefined,
      lineOfSightStart: mode !== 'lineOfSight' ? null : undefined,
      lineOfSightResult: mode !== 'lineOfSight' ? null : undefined,
    }),

  setPlacingElementType: (type) =>
    set({
      placingElementType: type,
      toolMode: type ? 'place' : 'select',
    }),

  setPlacingHeight: (height) => set({ placingHeight: height }),

  setPreviewPosition: (pos, valid) =>
    set({ previewPosition: pos, isPreviewValid: valid }),

  setLineOfSightResult: (result) => set({ lineOfSightResult: result }),

  setLineOfSightStart: (point) => set({ lineOfSightStart: point }),

  setIsDragging: (dragging) => set({ isDragging: dragging }),

  setWeatherTransition: (value) => set({ weatherTransition: value }),

  clearAll: () =>
    set({
      elements: [],
      selectedElementId: null,
      lineOfSightResult: null,
      lineOfSightStart: null,
    }),
}));
