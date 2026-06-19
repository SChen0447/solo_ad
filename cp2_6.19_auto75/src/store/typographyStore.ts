import { create } from 'zustand';
import { TypographySample, createDefaultSample } from '@/types';

interface TypographyStore {
  samples: TypographySample[];
  unifiedMode: boolean;
  addSample: () => void;
  removeSample: (id: string) => void;
  updateSample: (id: string, updates: Partial<TypographySample>) => void;
  setUnifiedMode: (mode: boolean) => void;
  importSamples: (samples: TypographySample[]) => void;
}

const initialSamples: TypographySample[] = [
  createDefaultSample({ id: crypto.randomUUID() }),
  createDefaultSample({
    id: crypto.randomUUID(),
    fontFamily: 'Playfair Display',
    fontSize: 24,
    lineHeight: 1.6,
    fontWeight: 700,
    color: '#1a1a1a',
    text: 'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.',
  }),
  createDefaultSample({
    id: crypto.randomUUID(),
    fontFamily: 'Source Code Pro',
    fontSize: 14,
    lineHeight: 1.4,
    fontWeight: 300,
    color: '#555555',
    text: 'Good typography is invisible. Bad typography is everywhere. Choose wisely and let the words speak.',
  }),
];

const TYPOGRAPHY_KEYS: (keyof Pick<TypographySample, 'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight' | 'color'>)[] = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'fontWeight',
  'color',
];

export const useTypographyStore = create<TypographyStore>((set) => ({
  samples: initialSamples,
  unifiedMode: false,

  addSample: () =>
    set((state) => ({
      samples: [...state.samples, createDefaultSample()],
    })),

  removeSample: (id) =>
    set((state) => ({
      samples: state.samples.filter((s) => s.id !== id),
    })),

  updateSample: (id, updates) =>
    set((state) => {
      if (!state.unifiedMode) {
        return {
          samples: state.samples.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        };
      }

      const typographyUpdates: Partial<TypographySample> = {};
      for (const key of TYPOGRAPHY_KEYS) {
        if (key in updates) {
          typographyUpdates[key] = updates[key];
        }
      }

      if (Object.keys(typographyUpdates).length === 0) {
        return {
          samples: state.samples.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        };
      }

      return {
        samples: state.samples.map((s) =>
          s.id === id
            ? { ...s, ...updates }
            : { ...s, ...typographyUpdates }
        ),
      };
    }),

  setUnifiedMode: (mode) => set({ unifiedMode: mode }),

  importSamples: (samples) => set({ samples }),
}));
