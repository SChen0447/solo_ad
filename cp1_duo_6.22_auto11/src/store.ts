import { create } from 'zustand';
import {
  SubtitleStyle,
  CropArea,
  CardRecord,
  DEFAULT_STYLE,
  MOVIE_TEMPLATES,
} from '@/types';

const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 40;
const MAX_WORDS = 60;
const VALID_SHADOW = ['none', 'light', 'medium', 'heavy'] as const;
const VALID_ALIGN = ['left', 'center', 'right'] as const;

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

function clampStyle(
  current: SubtitleStyle,
  input: Partial<SubtitleStyle>
): SubtitleStyle {
  const merged = { ...current, ...input };

  if (typeof merged.fontSize === 'number') {
    merged.fontSize = Math.max(
      MIN_FONT_SIZE,
      Math.min(MAX_FONT_SIZE, Math.round(merged.fontSize))
    );
  }

  if (
    typeof merged.shadowLevel === 'string' &&
    !VALID_SHADOW.includes(merged.shadowLevel as any)
  ) {
    merged.shadowLevel = current.shadowLevel;
  }

  if (
    typeof merged.textAlign === 'string' &&
    !VALID_ALIGN.includes(merged.textAlign as any)
  ) {
    merged.textAlign = current.textAlign;
  }

  if (typeof merged.fontColor === 'string' && !merged.fontColor.startsWith('#')) {
    merged.fontColor = current.fontColor;
  }

  if (typeof merged.fontFamily === 'string' && merged.fontFamily.trim() === '') {
    merged.fontFamily = current.fontFamily;
  }

  return merged;
}

function countWords(text: string): number {
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = text
    .split(/\s+/)
    .filter((w) => w.length > 0 && /[a-zA-Z]/.test(w)).length;
  return cn + en;
}

function truncateText(text: string, maxWords: number): string {
  if (countWords(text) <= maxWords) return text;

  const chars = Array.from(text);
  let result = '';
  let wordCount = 0;
  let buffer = '';

  for (const ch of chars) {
    if (/[\u4e00-\u9fa5]/.test(ch)) {
      if (wordCount >= maxWords) break;
      result += ch;
      wordCount += 1;
      buffer = '';
    } else if (/\s/.test(ch)) {
      if (buffer.length > 0) {
        if (/[a-zA-Z]/.test(buffer)) {
          if (wordCount >= maxWords) break;
          wordCount += 1;
        }
        result += buffer;
        buffer = '';
      }
      result += ch;
    } else {
      buffer += ch;
    }
  }

  if (buffer.length > 0 && wordCount < maxWords) {
    result += buffer;
  }

  return result;
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
  setSubtitleText: (text) =>
    set({ subtitleText: truncateText(text, MAX_WORDS) }),
  setSubtitleStyle: (style) =>
    set((state) => ({
      subtitleStyle: clampStyle(state.subtitleStyle, style),
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
        subtitleStyle: clampStyle(DEFAULT_STYLE, template.style),
      });
    }
  },
  setCropArea: (area) => set({ cropArea: area }),
  setExportFormat: (format) =>
    set({ exportFormat: format === 'jpg' ? 'jpg' : 'png' }),
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
      subtitleText: truncateText(record.subtitleText, MAX_WORDS),
      subtitleStyle: clampStyle(DEFAULT_STYLE, record.subtitleStyle),
      activeTemplate: record.templateName || null,
      exportFormat: record.exportFormat === 'jpg' ? 'jpg' : 'png',
    }),
}));
