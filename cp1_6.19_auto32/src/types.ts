export type RGB = [number, number, number];

export interface Ingredient {
  id: string;
  name: string;
  color: string;
  glow: string;
  rgb: RGB;
}

export type SlotState = Ingredient | null;
export type Slots = [SlotState, SlotState, SlotState];

export type PotionQuality = '普通' | '优秀' | '完美';

export interface BrewResult {
  name: string;
  color: string;
  rgb: RGB;
  quality: PotionQuality;
  isMatch: boolean;
  recipeId?: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredientIds: string[];
  resultColor: string;
  rgb: RGB;
  description: string;
}

export interface ShakeState {
  isShaking: boolean;
  durationMs: number;
  particleCount: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3 ? h.split('').map(c => c + c).join('') : h,
    16,
  );
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function blendColors(ings: (Ingredient | null)[]): RGB {
  const present = ings.filter(Boolean) as Ingredient[];
  if (present.length === 0) return [40, 40, 40];
  let r = 0, g = 0, b = 0;
  for (const ing of present) {
    r += ing.rgb[0];
    g += ing.rgb[1];
    b += ing.rgb[2];
  }
  const n = present.length;
  return [clamp(r / n, 0, 255), clamp(g / n, 0, 255), clamp(b / n, 0, 255)];
}

export function rgbWithAlpha(rgb: RGB, alpha: number): string {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;
}
