export interface HSL {
  h: number;
  s: number;
  l: number;
}

export type WCAGLevel = 'AAA' | 'AA' | 'Fail';

export interface ColorSwatch {
  name: string;
  hex: string;
  hsl: HSL;
  level: number;
  contrast: number;
  wcagLevel: WCAGLevel;
}

export interface ColorToken {
  swatch: ColorSwatch;
  customName: string;
  cssVariable: string;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  primaryColor: string;
  secondaryColor: string;
  primaryScale: ColorSwatch[];
  secondaryScale: ColorSwatch[];
  tokenNames: Record<string, string>;
}

export type ThemeMode = 'light' | 'dark';

export interface AppState {
  primaryColor: string;
  secondaryColor: string;
  primaryScale: ColorSwatch[];
  secondaryScale: ColorSwatch[];
  tokenNames: Record<string, string>;
  history: HistorySnapshot[];
  themeMode: ThemeMode;
  isAnimating: boolean;
}
