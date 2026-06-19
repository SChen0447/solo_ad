export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface Color {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  name: string;
}

export interface Palette {
  id: string;
  name: string;
  primary: Color;
  colors: Color[];
  type: PaletteType;
  createdAt: number;
}

export type PaletteType =
  | 'analogous'
  | 'complementary'
  | 'triadic'
  | 'tetradic'
  | 'monochromatic';

export interface MoodBoardItem {
  id: string;
  type: 'color' | 'text';
  x: number;
  y: number;
  color?: Color;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
}

export type BackgroundTexture =
  | 'solid'
  | 'marble'
  | 'watercolor'
  | 'paper'
  | 'geometric'
  | 'gradient';

export interface MoodBoard {
  id: string;
  name: string;
  items: MoodBoardItem[];
  background: BackgroundTexture;
  backgroundColor: string;
  createdAt: number;
  updatedAt: number;
  note?: string;
}

export interface HistoryItem {
  id: string;
  palette: Palette;
  timestamp: number;
}
