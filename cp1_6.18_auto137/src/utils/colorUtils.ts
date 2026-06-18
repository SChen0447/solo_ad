import type { HSL, Swatch } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

export function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function hslObjToHex(hsl: HSL): string {
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

export function hexToHsl(hex: string): HSL {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
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
    l: Math.round(l * 100),
  };
}

export function hueOffset(base: HSL, offset: number): HSL {
  return {
    ...base,
    h: ((base.h + offset) % 360 + 360) % 360,
  };
}

export function lightnessStep(base: HSL, step: number): HSL {
  return {
    ...base,
    l: clamp(base.l + step, 10, 90),
  };
}

export function saturationStep(base: HSL, step: number): HSL {
  return {
    ...base,
    s: clamp(base.s + step, 5, 100),
  };
}

export function getContrastColor(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '#000000';

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1A1A1A' : '#FFFFFF';
}

export function generatePalette(primary: HSL): Swatch[] {
  const primaryDark: HSL = {
    h: primary.h,
    s: primary.s,
    l: clamp(primary.l - 20, 15, 75),
  };

  const primaryLight: HSL = {
    h: primary.h,
    s: primary.s,
    l: clamp(primary.l + 20, 25, 90),
  };

  const accent: HSL = {
    h: ((primary.h + 180) % 360 + 360) % 360,
    s: clamp(primary.s + 10, 25, 100),
    l: clamp(primary.l + 5, 35, 70),
  };

  const background: HSL = {
    h: primary.h,
    s: clamp(primary.s - 55, 3, 15),
    l: clamp(primary.l + 45, 92, 97),
  };

  const createSwatch = (
    id: string,
    name: Swatch['name'],
    label: string,
    hsl: HSL
  ): Swatch => ({
    id,
    name,
    label,
    hsl,
    hex: hslObjToHex(hsl),
  });

  return [
    createSwatch('primary', 'primary', '主色', primary),
    createSwatch('primary-dark', 'primary-dark', '主色深', primaryDark),
    createSwatch('primary-light', 'primary-light', '主色浅', primaryLight),
    createSwatch('accent', 'accent', '点缀色', accent),
    createSwatch('background', 'background', '背景色', background),
  ];
}

export function applySyncRules(
  swatches: Swatch[],
  updatedId: string,
  newHsl: HSL
): Swatch[] {
  const updatedSwatch = swatches.find(s => s.id === updatedId);
  if (!updatedSwatch) return swatches;

  const oldHsl = updatedSwatch.hsl;
  const hDelta = newHsl.h - oldHsl.h;
  const sDelta = newHsl.s - oldHsl.s;
  const lDelta = newHsl.l - oldHsl.l;

  return swatches.map(swatch => {
    if (swatch.id === updatedId) {
      return { ...swatch, hsl: newHsl, hex: hslObjToHex(newHsl) };
    }

    if (updatedId === 'primary') {
      let updated = { ...swatch.hsl };

      if (swatch.name === 'primary-dark' || swatch.name === 'primary-light') {
        const lDiff = swatch.hsl.l - oldHsl.l;
        updated = {
          h: ((swatch.hsl.h + hDelta) % 360 + 360) % 360,
          s: clamp(swatch.hsl.s + sDelta, 5, 100),
          l: clamp(newHsl.l + lDiff, 10, 90),
        };
      } else if (swatch.name === 'accent') {
        const sRatio = oldHsl.s > 0 ? newHsl.s / oldHsl.s : 1;
        const lDiff = swatch.hsl.l - oldHsl.l;
        updated = {
          h: ((swatch.hsl.h + hDelta) % 360 + 360) % 360,
          s: clamp(Math.round(swatch.hsl.s * sRatio), 20, 100),
          l: clamp(newHsl.l + lDiff, 10, 90),
        };
      } else if (swatch.name === 'background') {
        const sDiff = swatch.hsl.s - oldHsl.s;
        updated = {
          h: ((swatch.hsl.h + hDelta) % 360 + 360) % 360,
          s: clamp(newHsl.s + sDiff, 3, 20),
          l: swatch.hsl.l,
        };
      }

      return { ...swatch, hsl: updated, hex: hslObjToHex(updated) };
    }

    return swatch;
  });
}
