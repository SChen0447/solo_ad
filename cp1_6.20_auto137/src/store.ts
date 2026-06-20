import { create } from 'zustand';
import type { Diary, EmotionType, EmojiItem, CollageTemplate } from './types';
import { fetchDiaries, createDiary, deleteDiary as apiDeleteDiary, fetchDiary, generateCollage } from './api';

interface DiaryStore {
  diaries: Diary[];
  currentDiary: Diary | null;
  selectedEmotion: EmotionType | null;
  diaryText: string;
  emojiItems: EmojiItem[];
  selectedTemplate: CollageTemplate;
  collageUrl: string | null;
  isGenerating: boolean;
  currentMonth: string;
  isLoading: boolean;

  setCurrentMonth: (month: string) => void;
  loadDiaries: (month: string) => Promise<void>;
  loadDiary: (id: string) => Promise<void>;
  setSelectedEmotion: (emotion: EmotionType) => void;
  setDiaryText: (text: string) => void;
  addEmoji: (emoji: string) => void;
  updateEmojiPosition: (index: number, x: number, y: number) => void;
  removeEmoji: (index: number) => void;
  setSelectedTemplate: (template: CollageTemplate) => void;
  saveDiary: () => Promise<Diary | null>;
  generateCollageImage: () => Promise<string | null>;
  deleteDiary: (id: string) => Promise<void>;
  resetEditor: () => void;
}

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  diaries: [],
  currentDiary: null,
  selectedEmotion: null,
  diaryText: '',
  emojiItems: [],
  selectedTemplate: 'watercolor',
  collageUrl: null,
  isGenerating: false,
  currentMonth: getCurrentMonth(),
  isLoading: false,

  setCurrentMonth: (month) => set({ currentMonth: month }),

  loadDiaries: async (month) => {
    set({ isLoading: true });
    try {
      const diaries = await fetchDiaries(month);
      set({ diaries, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadDiary: async (id) => {
    try {
      const diary = await fetchDiary(id);
      set({ currentDiary: diary });
    } catch {
      // handle error
    }
  },

  setSelectedEmotion: (emotion) => set({ selectedEmotion: emotion }),

  setDiaryText: (text) => set({ diaryText: text }),

  addEmoji: (emoji) => {
    const { emojiItems } = get();
    if (emojiItems.length >= 5) return;
    set({
      emojiItems: [...emojiItems, {
        emoji,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        scale: 1,
      }],
    });
  },

  updateEmojiPosition: (index, x, y) => {
    const { emojiItems } = get();
    const updated = [...emojiItems];
    updated[index] = { ...updated[index], x, y };
    set({ emojiItems: updated });
  },

  removeEmoji: (index) => {
    const { emojiItems } = get();
    set({ emojiItems: emojiItems.filter((_, i) => i !== index) });
  },

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),

  saveDiary: async () => {
    const { selectedEmotion, diaryText, emojiItems, selectedTemplate } = get();
    if (!selectedEmotion || !diaryText.trim()) return null;

    try {
      const diary = await createDiary({
        emotion: selectedEmotion,
        text: diaryText,
        emojis: emojiItems,
        template: selectedTemplate,
      });
      const { diaries } = get();
      set({ diaries: [...diaries, diary] });
      return diary;
    } catch {
      return null;
    }
  },

  generateCollageImage: async () => {
    const { selectedEmotion, diaryText, emojiItems, selectedTemplate } = get();
    if (!selectedEmotion) return null;

    set({ isGenerating: true });
    try {
      const result = await generateCollage({
        emotion: selectedEmotion,
        text: diaryText,
        emojis: emojiItems.map((e) => e.emoji),
        template: selectedTemplate,
      });
      set({ collageUrl: result.collageUrl, isGenerating: false });
      return result.collageUrl;
    } catch {
      set({ isGenerating: false });
      return null;
    }
  },

  deleteDiary: async (id) => {
    try {
      await apiDeleteDiary(id);
      const { diaries } = get();
      set({ diaries: diaries.filter((d) => d.id !== id) });
    } catch {
      // handle error
    }
  },

  resetEditor: () => {
    set({
      selectedEmotion: null,
      diaryText: '',
      emojiItems: [],
      selectedTemplate: 'watercolor',
      collageUrl: null,
      isGenerating: false,
    });
  },
}));
