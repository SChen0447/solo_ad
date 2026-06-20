import type { HSL, ColorSwatch, WCAGLevel, ColorToken } from './colorTypes';

export function hexToHsl(hex: string): HSL {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { h: 0, s: 0, l: 0 };
  }

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

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
    l: Math.round(l * 100)
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateColorScale(baseColor: string, baseName: string = 'color'): ColorSwatch[] {
  const hsl = hexToHsl(baseColor);
  const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  const lightnessValues = [95, 85, 75, 65, 55, 45, 35, 25, 15, 5];

  const scale: ColorSwatch[] = levels.map((level, index) => {
    const hex = hslToHex(hsl.h, hsl.s, lightnessValues[index]);
    const contrast = calculateContrast(hex, '#ffffff');
    const wcagLevel = getWCAGLevel(contrast);

    return {
      name: `${baseName}-${level}`,
      hex,
      hsl: { ...hsl, l: lightnessValues[index] },
      level,
      contrast,
      wcagLevel
    };
  });

  return scale;
}

export function calculateContrast(color1: string, color2: string): number {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getWCAGLevel(contrast: number): WCAGLevel {
  if (contrast >= 7) return 'AAA';
  if (contrast >= 4.5) return 'AA';
  return 'Fail';
}

export function isValidHex(hex: string): boolean {
  return /^#?([a-f\d]{6}|[a-f\d]{3})$/i.test(hex);
}

export function normalizeHex(hex: string): string {
  let normalized = hex.replace('#', '');

  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((c) => c + c)
      .join('');
  }

  return `#${normalized.toLowerCase()}`;
}

export function exportCSSVariables(primaryTokens: ColorToken[], secondaryTokens: ColorToken[]): string {
  const allTokens = [...primaryTokens, ...secondaryTokens];
  return allTokens.map((t) => `  ${t.customName}: ${t.swatch.hex};`).join('\n');
}

export function exportJSON(primaryTokens: ColorToken[], secondaryTokens: ColorToken[]): string {
  const allTokens = [...primaryTokens, ...secondaryTokens];
  const result = allTokens.reduce((acc, t) => {
    acc[t.customName.replace('--', '')] = t.swatch.hex;
    return acc;
  }, {} as Record<string, string>);

  return JSON.stringify({ colors: result }, null, 2);
}

export function exportTailwindConfig(primaryScale: ColorSwatch[], secondaryScale: ColorSwatch[]): string {
  const formatScale = (scale: ColorSwatch[]) =>
    scale.reduce((acc, s) => {
      acc[s.level] = s.hex;
      return acc;
    }, {} as Record<number, string>);

  const config = {
    theme: {
      extend: {
        colors: {
          primary: formatScale(primaryScale),
          secondary: formatScale(secondaryScale)
        }
      }
    }
  };

  return JSON.stringify(config, null, 2);
}

export function createColorTokens(
  scale: ColorSwatch[],
  prefix: string,
  tokenNames: Record<string, string>
): ColorToken[] {
  return scale.map((swatch) => {
    const defaultName = `--${prefix}-${swatch.level}`;
    const customName = tokenNames[swatch.name] || defaultName;

    return {
      swatch,
      customName,
      cssVariable: `var(${customName})`
    };
  });
}
