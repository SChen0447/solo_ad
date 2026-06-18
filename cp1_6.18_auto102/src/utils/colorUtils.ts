import chroma from 'chroma-js';

export type ColorLevel = 'lightest' | 'light' | 'primary' | 'dark' | 'darkest';

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorVariants {
  lightest: string;
  light: string;
  primary: string;
  dark: string;
  darkest: string;
}

const variantCache = new Map<string, ColorVariants>();

export function hexToRgb(hex: string): RGB {
  const color = chroma(hex);
  const [r, g, b] = color.rgb();
  return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return chroma(r, g, b).hex();
}

export function hexToHsl(hex: string): HSL {
  const color = chroma(hex);
  const [h, s, l] = color.hsl();
  return {
    h: isNaN(h) ? 0 : h,
    s: s * 100,
    l: l * 100
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  return chroma(h, s / 100, l / 100, 'hsl').hex();
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const [h, s, l] = chroma(r, g, b).hsl();
  return {
    h: isNaN(h) ? 0 : h,
    s: s * 100,
    l: l * 100
  };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const [r, g, b] = chroma(h, s / 100, l / 100, 'hsl').rgb();
  return { r, g, b };
}

export function isValidHex(hex: string): boolean {
  try {
    chroma(hex);
    return true;
  } catch {
    return false;
  }
}

export function generateVariants(baseHex: string): ColorVariants {
  const cacheKey = baseHex.toLowerCase();
  if (variantCache.has(cacheKey)) {
    return variantCache.get(cacheKey)!;
  }

  const baseColor = chroma(baseHex);
  const baseHsl = baseColor.hsl();
  const h = isNaN(baseHsl[0]) ? 0 : baseHsl[0];
  const s = baseHsl[1];
  const l = baseHsl[2];

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const variants: ColorVariants = {
    lightest: chroma(h, clamp(s - 0.1, 0, 1), clamp(l + 0.3, 0, 1), 'hsl').hex(),
    light: chroma(h, clamp(s - 0.05, 0, 1), clamp(l + 0.15, 0, 1), 'hsl').hex(),
    primary: baseColor.hex(),
    dark: chroma(h, clamp(s + 0.05, 0, 1), clamp(l - 0.15, 0, 1), 'hsl').hex(),
    darkest: chroma(h, clamp(s + 0.1, 0, 1), clamp(l - 0.3, 0, 1), 'hsl').hex()
  };

  variantCache.set(cacheKey, variants);
  return variants;
}

export function getContrastColor(hex: string): string {
  const luminance = chroma(hex).luminance();
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function getLevelName(level: ColorLevel): string {
  const names: Record<ColorLevel, string> = {
    lightest: '浅色变体',
    light: '浅色',
    primary: '主色',
    dark: '深色',
    darkest: '深色变体'
  };
  return names[level];
}
