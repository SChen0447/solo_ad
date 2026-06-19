export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorShade {
  level: number;
  hsl: HSL;
  hex: string;
  contrastRatio: number;
  wcagLevel: 'AAA' | 'AA' | 'Fail' | 'Large-AA';
}

export interface ColorToken {
  name: string;
  shade: ColorShade;
  category: 'primary' | 'secondary' | 'neutral';
}

export interface ColorPalette {
  primary: ColorShade[];
  secondary: ColorShade[];
  neutral: ColorShade[];
}

export interface TokenMap {
  primary: Record<number, string>;
  secondary: Record<number, string>;
  neutral: Record<number, string>;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  primaryBase: string;
  secondaryBase: string;
  palette: ColorPalette;
  tokens: TokenMap;
}

export type ThemeMode = 'light' | 'dark';

export type ExportFormat = 'css' | 'json' | 'tailwind';
