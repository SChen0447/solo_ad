import { ColorShade, ColorPalette, HSL } from './colorTypes';

const LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const LIGHTNESS_MAP: Record<number, number> = {
  50: 0.97,
  100: 0.93,
  200: 0.86,
  300: 0.77,
  400: 0.66,
  500: 0.55,
  600: 0.45,
  700: 0.36,
  800: 0.27,
  900: 0.19,
};

const SATURATION_ADJUST: Record<number, number> = {
  50: 0.5,
  100: 0.65,
  200: 0.8,
  300: 0.92,
  400: 1,
  500: 1,
  600: 0.95,
  700: 0.85,
  800: 0.7,
  900: 0.55,
};

export function hexToHsl(hex: string): HSL {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const lig = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    sat = lig > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      case b:
        hue = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(sat * 100),
    l: Math.round(lig * 100),
  };
}

export function hslToHex(hsl: HSL): string {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
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

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function linearize(v: number): number {
  const val = v / 255;
  return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  return (
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
  );
}

export function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

export function getWcagLevel(
  ratio: number,
): 'AAA' | 'AA' | 'Fail' | 'Large-AA' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'Large-AA';
  return 'Fail';
}

export function generateShades(baseHex: string): ColorShade[] {
  const baseHsl = hexToHsl(baseHex);
  const baseSat = baseHsl.s;
  const baseHue = baseHsl.h;

  return LEVELS.map((level) => {
    const targetLig = LIGHTNESS_MAP[level] * 100;
    const targetSat = baseSat * SATURATION_ADJUST[level];
    const hsl: HSL = {
      h: baseHue,
      s: Math.round(targetSat),
      l: Math.round(targetLig),
    };
    const hex = hslToHex(hsl);
    const whiteBg = '#FFFFFF';
    const contrastRatio = calculateContrastRatio(hex, whiteBg);
    return {
      level,
      hsl,
      hex,
      contrastRatio: Math.round(contrastRatio * 100) / 100,
      wcagLevel: getWcagLevel(contrastRatio),
    };
  });
}

export function generateNeutralShades(baseHue: number): ColorShade[] {
  return LEVELS.map((level) => {
    const targetLig = LIGHTNESS_MAP[level] * 100;
    const targetSat =
      level === 50 || level === 900
        ? 3
        : level <= 300
        ? 6
        : level <= 700
        ? 8
        : 5;
    const hsl: HSL = {
      h: baseHue,
      s: Math.round(targetSat),
      l: Math.round(targetLig),
    };
    const hex = hslToHex(hsl);
    const whiteBg = '#FFFFFF';
    const contrastRatio = calculateContrastRatio(hex, whiteBg);
    return {
      level,
      hsl,
      hex,
      contrastRatio: Math.round(contrastRatio * 100) / 100,
      wcagLevel: getWcagLevel(contrastRatio),
    };
  });
}

export function generatePalette(
  primaryHex: string,
  secondaryHex: string,
): ColorPalette {
  const primary = generateShades(primaryHex);
  const secondary = generateShades(secondaryHex);
  const primaryHsl = hexToHsl(primaryHex);
  const neutral = generateNeutralShades(primaryHsl.h);
  return { primary, secondary, neutral };
}

export function generateDefaultTokenNames(): Record<number, string> {
  const names: Record<number, string> = {};
  LEVELS.forEach((level) => {
    names[level] = `${level}`;
  });
  return names;
}

export function generateCssVariables(
  palette: ColorPalette,
  tokens: Record<'primary' | 'secondary' | 'neutral', Record<number, string>>,
): string {
  const lines: string[] = [':root {'];
  (['primary', 'secondary', 'neutral'] as const).forEach((category) => {
    lines.push(`  /* ${category} colors */`);
    palette[category].forEach((shade) => {
      const name = tokens[category][shade.level] || String(shade.level);
      lines.push(`  --${category}-${name}: ${shade.hex};`);
    });
  });
  lines.push('}');
  return lines.join('\n');
}

export function generateJson(
  palette: ColorPalette,
  tokens: Record<'primary' | 'secondary' | 'neutral', Record<number, string>>,
): string {
  const result: Record<string, Record<string, string>> = {};
  (['primary', 'secondary', 'neutral'] as const).forEach((category) => {
    result[category] = {};
    palette[category].forEach((shade) => {
      const name = tokens[category][shade.level] || String(shade.level);
      result[category][name] = shade.hex;
    });
  });
  return JSON.stringify(result, null, 2);
}

export function generateTailwindConfig(
  palette: ColorPalette,
  tokens: Record<'primary' | 'secondary' | 'neutral', Record<number, string>>,
): string {
  const buildColorObject = (
    category: 'primary' | 'secondary' | 'neutral',
  ): string => {
    const entries = palette[category]
      .map((shade) => {
        const name = tokens[category][shade.level] || String(shade.level);
        return `    '${name}': '${shade.hex}'`;
      })
      .join(',\n');
    return `  ${category}: {\n${entries}\n  }`;
  };

  return `module.exports = {
  theme: {
    extend: {
      colors: {
${buildColorObject('primary')},
${buildColorObject('secondary')},
${buildColorObject('neutral')},
      },
    },
  },
};`;
}
