import { create } from 'zustand';
import type { ColorBlindType } from '@/utils/colorBlindMatrices';
import type { ContrastMetrics } from '@/utils/contrastCalculator';

interface AppState {
  colorBlindType: ColorBlindType;
  originalImageData: ImageData | null;
  simulatedImageData: ImageData | null;
  metrics: ContrastMetrics | null;
  sliderPosition: number;
  inputText: string;
  uploadedImageUrl: string | null;
  isDraggingFile: boolean;
  panelSplit: number;

  setColorBlindType: (type: ColorBlindType) => void;
  setOriginalImageData: (data: ImageData | null) => void;
  setSimulatedImageData: (data: ImageData | null) => void;
  setMetrics: (metrics: ContrastMetrics | null) => void;
  setSliderPosition: (pos: number) => void;
  setInputText: (text: string) => void;
  setUploadedImageUrl: (url: string | null) => void;
  setIsDraggingFile: (dragging: boolean) => void;
  setPanelSplit: (split: number) => void;
  reset: () => void;
}

const initialState = {
  colorBlindType: 'protanopia' as ColorBlindType,
  originalImageData: null as ImageData | null,
  simulatedImageData: null as ImageData | null,
  metrics: null as ContrastMetrics | null,
  sliderPosition: 0.5,
  inputText: '',
  uploadedImageUrl: null as string | null,
  isDraggingFile: false,
  panelSplit: 0.5,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setColorBlindType: (type) => set({ colorBlindType: type }),
  setOriginalImageData: (data) => set({ originalImageData: data }),
  setSimulatedImageData: (data) => set({ simulatedImageData: data }),
  setMetrics: (metrics) => set({ metrics }),
  setSliderPosition: (pos) => set({ sliderPosition: Math.max(0, Math.min(1, pos)) }),
  setInputText: (text) => set({ inputText: text.slice(0, 500) }),
  setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
  setIsDraggingFile: (dragging) => set({ isDraggingFile: dragging }),
  setPanelSplit: (split) => set({ panelSplit: Math.max(0.2, Math.min(0.8, split)) }),
  reset: () => set(initialState),
}));
