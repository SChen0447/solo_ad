export interface Theme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export type ColorKey = keyof ThemeColors;
