import { create } from 'zustand';
import {
  SubtitleStyle,
  CropArea,
  CardRecord,
  DEFAULT_STYLE,
  MOVIE_TEMPLATES,
} from '@/types';

interface AppStore {
  imageUrl: string | null;
  croppedImageUrl: string | null;
  subtitleText: string;
  subtitleStyle: SubtitleStyle;
  activeTemplate: string | null;
  cropArea: CropArea | null;
  history: CardRecord[];
  exportFormat: 'png' | 'jpg';
  isExporting: boolean;

  setImageUrl: (url: string | null) => void;
  setCroppedImageUrl: (url: string | null) => void;
  setSubtitleText: (text: string) => void;
  setSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  setActiveTemplate: (name: string | null) => void;
  setCropArea: (area: CropArea | null) => void;
  setExportFormat: (format: 'png' | 'jpg') => void;
  setIsExporting: (val: boolean) => void;
  addToHistory: (record: CardRecord) => void;
  loadHistory: (records: CardRecord[]) => void;
  loadFromHistory: (record: CardRecord) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  imageUrl: null,
  croppedImageUrl: null,
  subtitleText: '',
  subtitleStyle: { ...DEFAULT_STYLE },
  activeTemplate: null,
  cropArea: null,
  history: [],
  exportFormat: 'png',
  isExporting: false,

  setImageUrl: (url) => set({ imageUrl: url }),
  setCroppedImageUrl: (url) => set({ croppedImageUrl: url }),
  setSubtitleText: (text) => set({ subtitleText: text }),
  setSubtitleStyle: (style) =>
    set((state) => ({
      subtitleStyle: { ...state.subtitleStyle, ...style },
      activeTemplate: null,
    })),
  setActiveTemplate: (name) => {
    if (!name) {
      set({ activeTemplate: null });
      return;
    }
    const template = MOVIE_TEMPLATES.find((t) => t.name === name);
    if (template) {
      set({
        activeTemplate: name,
        subtitleStyle: { ...template.style },
      });
    }
  },
  setCropArea: (area) => set({ cropArea: area }),
  setExportFormat: (format) => set({ exportFormat: format }),
  setIsExporting: (val) => set({ isExporting: val }),
  addToHistory: (record) =>
    set((state) => {
      const newHistory = [record, ...state.history];
      if (newHistory.length > 50) {
        newHistory.pop();
      }
      return { history: newHistory };
    }),
  loadHistory: (records) => set({ history: records }),
  loadFromHistory: (record) =>
    set({
      imageUrl: record.imageUrl,
      croppedImageUrl: record.croppedImageUrl,
      subtitleText: record.subtitleText,
      subtitleStyle: { ...record.subtitleStyle },
      activeTemplate: record.templateName || null,
      exportFormat: record.exportFormat,
    }),
}));
