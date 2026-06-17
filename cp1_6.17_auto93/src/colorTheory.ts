export interface HSL {
  h: number;
  s: number;
  l: number;
}

export type HarmonyRule = 'complementary' | 'analogous' | 'triadic' | 'splitComplementary';

export interface HSLOffset {
  h: number;
  s: number;
  l: number;
}

export const HARMONY_RULE_LABELS: Record<HarmonyRule, string> = {
  complementary: '互补',
  analogous: '类似',
  triadic: '三色',
  splitComplementary: '分裂互补'
};

export function hslToString(hsl: HSL): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

export function hslToHex(hsl: HSL): string {
  const { h, s, l } = hsl;
  const s1 = s / 100;
  const l1 = l / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l1 - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  const toHex = (v: number): string => {
    const hex = Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return hex.toUpperCase();
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToHsl(hex: string): HSL {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function normalizeHue(hue: number): number {
  let h = hue % 360;
  if (h < 0) h += 360;
  return h;
}

export function getComplementary(base: HSL): HSL[] {
  return [
    base,
    { h: normalizeHue(base.h + 180), s: base.s, l: base.l }
  ];
}

export function getAnalogous(base: HSL): HSL[] {
  return [
    { h: normalizeHue(base.h - 60), s: base.s, l: base.l },
    { h: normalizeHue(base.h - 30), s: base.s, l: base.l },
    base,
    { h: normalizeHue(base.h + 30), s: base.s, l: base.l },
    { h: normalizeHue(base.h + 60), s: base.s, l: base.l }
  ];
}

export function getTriadic(base: HSL): HSL[] {
  return [
    base,
    { h: normalizeHue(base.h + 120), s: base.s, l: base.l },
    { h: normalizeHue(base.h + 240), s: base.s, l: base.l }
  ];
}

export function getSplitComplementary(base: HSL): HSL[] {
  return [
    base,
    { h: normalizeHue(base.h + 150), s: base.s, l: base.l },
    { h: normalizeHue(base.h + 210), s: base.s, l: base.l }
  ];
}

export function generateHarmonyColors(
  baseColor: HSL,
  rule: HarmonyRule,
  offset: HSLOffset = { h: 0, s: 0, l: 0 },
  lockedIndices: number[] = []
): HSL[] {
  let colors: HSL[];
  
  switch (rule) {
    case 'complementary':
      colors = getComplementary(baseColor);
      break;
    case 'analogous':
      colors = getAnalogous(baseColor);
      break;
    case 'triadic':
      colors = getTriadic(baseColor);
      break;
    case 'splitComplementary':
      colors = getSplitComplementary(baseColor);
      break;
    default:
      colors = [baseColor];
  }

  return colors.map((color, index) => {
    if (lockedIndices.includes(index)) {
      return color;
    }
    return {
      h: normalizeHue(color.h + offset.h),
      s: Math.max(0, Math.min(100, color.s + offset.s)),
      l: Math.max(0, Math.min(100, color.l + offset.l))
    };
  });
}

export function generateBaseHSL(): HSL {
  return { h: 210, s: 70, l: 50 };
}
