export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToHSL(hex: string): HSL {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function HSLToHex(hsl: HSL): string {
  const { h, s, l } = hsl;
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  let r: number, g: number, b: number;

  if (sNorm === 0) {
    r = g = b = lNorm;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function generateColorScale(baseHex: string): string[] {
  const baseHSL = hexToHSL(baseHex);
  const scale: string[] = [];

  const lightnessSteps = [95, 88, 78, 66, 54, 42, 30, 20, 11];
  const saturationSteps = [8, 16, 32, 56, 78, 100, 88, 70, 58];

  for (let i = 0; i < 9; i++) {
    const sFactor = saturationSteps[i] / 100;
    const adjustedS = Math.min(100, Math.max(0, baseHSL.s * sFactor + (1 - sFactor) * baseHSL.s));
    const adjustedL = Math.min(98, Math.max(3, lightnessSteps[i]));

    const hsl: HSL = {
      h: baseHSL.h,
      s: Math.round(adjustedS),
      l: adjustedL,
    };

    scale.push(HSLToHex(hsl));
  }

  return scale;
}

export function lightenColor(hex: string, percent: number): string {
  const hsl = hexToHSL(hex);
  hsl.l = Math.min(100, hsl.l + percent);
  return HSLToHex(hsl);
}

export function darkenColor(hex: string, percent: number): string {
  const hsl = hexToHSL(hex);
  hsl.l = Math.max(0, hsl.l - percent);
  return HSLToHex(hsl);
}

export function getContrastColor(hex: string): string {
  const hsl = hexToHSL(hex);
  return hsl.l > 50 ? '#333333' : '#FFFFFF';
}
