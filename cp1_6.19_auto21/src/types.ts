export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface FontConfig {
  family: string;
  size: number;
  lineHeight: number;
  letterSpacing: number;
  weight: FontWeight;
}

export interface FontPair {
  id: string;
  label: string;
  labelColor: string;
  heading: FontConfig;
  body: FontConfig;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  heading: FontConfig;
  body: FontConfig;
}

export type FontCategory = 'sans-serif' | 'serif' | 'display' | 'monospace';

export interface FontMeta {
  family: string;
  category: FontCategory;
  weights: FontWeight[];
}

export interface FontLabState {
  currentHeading: FontConfig;
  currentBody: FontConfig;
  cards: FontPair[];
  presets: Preset[];
  fonts: FontMeta[];
  nextCardIndex: number;
  updateHeading: (config: Partial<FontConfig>) => void;
  updateBody: (config: Partial<FontConfig>) => void;
  addCard: () => void;
  removeCard: (id: string) => void;
  reorderCards: (startIndex: number, endIndex: number) => void;
  applyPreset: (presetId: string) => void;
}

export const LABEL_COLORS: readonly string[] = [
  '#fde68a',
  '#a7f3d0',
  '#bfdbfe',
  '#fbcfe8',
  '#ddd6fe',
  '#fed7aa',
  '#bae6fd',
  '#d9f99d',
] as const;
