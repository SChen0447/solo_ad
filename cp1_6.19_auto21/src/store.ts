import { create } from 'zustand';
import type { FontLabState, FontConfig, FontPair, FontMeta } from '@/types';
import { LABEL_COLORS } from '@/types';
import { ALL_FONTS, loadGoogleFont } from '@/modules/fontLoader';
import { PRESETS } from '@/modules/presets';

const defaultHeading: FontConfig = {
  family: 'Playfair Display',
  size: 36,
  lineHeight: 1.3,
  letterSpacing: 0,
  weight: 700,
};

const defaultBody: FontConfig = {
  family: 'Inter',
  size: 16,
  lineHeight: 1.6,
  letterSpacing: 0,
  weight: 400,
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getCardLabel(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < letters.length) return `比例尺 ${letters[index]}`;
  return `比例尺 ${index + 1}`;
}

function pickLabelColor(index: number): string {
  const colors = LABEL_COLORS as readonly string[];
  return colors[index % colors.length];
}

function cloneFontConfig(config: FontConfig): FontConfig {
  return { ...config };
}

export const useStore = create<FontLabState>((set, get) => {
  ALL_FONTS.forEach(f => loadGoogleFont(f.family));

  return {
    currentHeading: { ...defaultHeading },
    currentBody: { ...defaultBody },
    cards: [],
    presets: PRESETS,
    fonts: ALL_FONTS as FontMeta[],
    nextCardIndex: 0,

    updateHeading: (config: Partial<FontConfig>) => {
      const newHeading = { ...get().currentHeading, ...config };
      if (config.family) loadGoogleFont(config.family);
      set({ currentHeading: newHeading });
    },

    updateBody: (config: Partial<FontConfig>) => {
      const newBody = { ...get().currentBody, ...config };
      if (config.family) loadGoogleFont(config.family);
      set({ currentBody: newBody });
    },

    addCard: () => {
      const { currentHeading, currentBody, nextCardIndex } = get();
      const newCard: FontPair = {
        id: generateId(),
        label: getCardLabel(nextCardIndex),
        labelColor: pickLabelColor(nextCardIndex),
        heading: cloneFontConfig(currentHeading),
        body: cloneFontConfig(currentBody),
      };
      loadGoogleFont(currentHeading.family);
      loadGoogleFont(currentBody.family);
      set(state => ({
        cards: [...state.cards, newCard],
        nextCardIndex: nextCardIndex + 1,
      }));
    },

    removeCard: (id: string) => {
      set(state => ({
        cards: state.cards.filter(c => c.id !== id),
      }));
    },

    reorderCards: (startIndex: number, endIndex: number) => {
      if (startIndex === endIndex) return;
      set(state => {
        const result = Array.from(state.cards);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { cards: result };
      });
    },

    applyPreset: (presetId: string) => {
      const preset = get().presets.find(p => p.id === presetId);
      if (!preset) return;
      loadGoogleFont(preset.heading.family);
      loadGoogleFont(preset.body.family);
      set({
        currentHeading: cloneFontConfig(preset.heading),
        currentBody: cloneFontConfig(preset.body),
      });
    },
  };
});

export default useStore;
