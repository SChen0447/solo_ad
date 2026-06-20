export interface ThemeVars {
  '--primary': string;
  '--secondary': string;
  '--bg': string;
  '--text': string;
  '--radius': number;
  '--shadow': number;
}

export interface SavedTheme {
  id: string;
  name: string;
  vars: ThemeVars;
  createdAt: number;
}

export type ThemeSide = 'left' | 'right';

export interface ThemeContextType {
  leftVars: ThemeVars;
  rightVars: ThemeVars;
  updateLeftVar: <K extends keyof ThemeVars>(key: K, value: ThemeVars[K]) => void;
  updateRightVar: <K extends keyof ThemeVars>(key: K, value: ThemeVars[K]) => void;
  setLeftVars: (vars: ThemeVars) => void;
  setRightVars: (vars: ThemeVars) => void;
}

export const defaultThemeVars: ThemeVars = {
  '--primary': '#6366f1',
  '--secondary': '#ec4899',
  '--bg': '#ffffff',
  '--text': '#1f2937',
  '--radius': 1,
  '--shadow': 1,
};

export const themeVarKeys: (keyof ThemeVars)[] = [
  '--primary',
  '--secondary',
  '--bg',
  '--text',
  '--radius',
  '--shadow',
];

export const colorVarKeys: (keyof ThemeVars)[] = [
  '--primary',
  '--secondary',
  '--bg',
  '--text',
];

export const numericVarKeys: (keyof ThemeVars)[] = [
  '--radius',
  '--shadow',
];
