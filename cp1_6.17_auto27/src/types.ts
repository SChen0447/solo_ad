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

export interface HSB {
  h: number;
  s: number;
  b: number;
}

export interface ColorInfo {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  percentage: number;
  name?: string;
}

export type Palette = ColorInfo[];

export interface HarmonySegment {
  color: ColorInfo;
  startAngle: number;
  endAngle: number;
  index: number;
}
