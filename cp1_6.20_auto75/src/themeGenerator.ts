import type {
  ExtractedColor,
  ThemeVariables,
  ThemePackage,
  RGB,
} from './types';
import {
  adjustBrightness,
  adjustSaturation,
  mixColors,
  getContrastRatio,
  hexToRgb,
  rgbToHex,
} from './utils/colorUtils';

const FONT_FAMILIES = [
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "'Roboto', 'Helvetica Neue', Arial, sans-serif",
  "'Poppins', 'Open Sans', sans-serif",
  "'Montserrat', -apple-system, sans-serif",
  "'Playfair Display', Georgia, serif",
];

function pickFontFamily(colors: ExtractedColor[]): string {
  const saturation =
    colors.reduce((sum, c) => sum + c.hsv.s, 0) / colors.length;
  const brightness =
    colors.reduce((sum, c) => sum + c.brightness, 0) / colors.length;

  if (saturation > 60 && brightness > 0.5) {
    return FONT_FAMILIES[2];
  }
  if (saturation < 30) {
    return FONT_FAMILIES[4];
  }
  if (brightness < 0.4) {
    return FONT_FAMILIES[3];
  }
  return FONT_FAMILIES[0];
}

function selectPrimary(colors: ExtractedColor[]): ExtractedColor {
  const sorted = [...colors].sort((a, b) => {
    const scoreA =
      a.percentage * 0.4 +
      (a.hsv.s / 100) * 0.3 +
      (a.brightness > 0.25 && a.brightness < 0.85 ? 0.3 : 0);
    const scoreB =
      b.percentage * 0.4 +
      (b.hsv.s / 100) * 0.3 +
      (b.brightness > 0.25 && b.brightness < 0.85 ? 0.3 : 0);
    return scoreB - scoreA;
  });
  return sorted[0] || colors[0];
}

function selectSecondary(
  colors: ExtractedColor[],
  primary: ExtractedColor,
): ExtractedColor {
  const candidates = colors.filter((c) => c.hex !== primary.hex);
  if (candidates.length === 0) return primary;

  const sorted = [...candidates].sort((a, b) => {
    const hueDiffA = Math.min(
      Math.abs(a.hsv.h - primary.hsv.h),
      360 - Math.abs(a.hsv.h - primary.hsv.h),
    );
    const hueDiffB = Math.min(
      Math.abs(b.hsv.h - primary.hsv.h),
      360 - Math.abs(b.hsv.h - primary.hsv.h),
    );
    return hueDiffB - hueDiffA;
  });

  return sorted[0];
}

function selectAccent(
  colors: ExtractedColor[],
  primary: ExtractedColor,
  secondary: ExtractedColor,
): ExtractedColor {
  const candidates = colors.filter(
    (c) => c.hex !== primary.hex && c.hex !== secondary.hex,
  );
  if (candidates.length === 0) return secondary;
  return candidates.sort((a, b) => b.hsv.s - a.hsv.s)[0];
}

function ensureContrast(
  foreground: string,
  background: string,
  minRatio: number = 4.5,
): string {
  let fg = foreground;
  let ratio = getContrastRatio(hexToRgb(fg), hexToRgb(background));
  let attempts = 0;
  const bgRgb = hexToRgb(background);
  const isBgDark = bgRgb.r * 0.299 + bgRgb.g * 0.587 + bgRgb.b * 0.114 < 128;

  while (ratio < minRatio && attempts < 20) {
    if (isBgDark) {
      fg = adjustBrightness(fg, 5);
    } else {
      fg = adjustBrightness(fg, -5);
    }
    ratio = getContrastRatio(hexToRgb(fg), hexToRgb(background));
    attempts++;
  }
  return fg;
}

function generateShadows(accentColor: string, isDark: boolean): string[] {
  const baseOpacity = isDark ? 0.3 : 0.1;
  const accentRgb = hexToRgb(accentColor);
  const accentStr = `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`;

  return [
    'none',
    `0 1px 2px rgba(0, 0, 0, ${baseOpacity}), 0 1px 1px rgba(${accentStr}, ${
      baseOpacity * 0.5
    })`,
    `0 3px 6px rgba(0, 0, 0, ${baseOpacity * 1.2}), 0 2px 4px rgba(${accentStr}, ${
      baseOpacity * 0.8
    })`,
    `0 10px 20px rgba(0, 0, 0, ${baseOpacity * 1.5}), 0 4px 8px rgba(${accentStr}, ${
      baseOpacity
    })`,
    `0 20px 40px rgba(0, 0, 0, ${baseOpacity * 2}), 0 8px 16px rgba(${accentStr}, ${
      baseOpacity * 1.2
    })`,
  ];
}

export function generateTheme(colors: ExtractedColor[]): ThemePackage {
  const safeColors = colors.length >= 5 ? colors : [...colors];
  while (safeColors.length < 5) {
    safeColors.push({
      hex: '#808080',
      rgb: { r: 128, g: 128, b: 128 },
      hsv: { h: 0, s: 0, v: 50 },
      brightness: 0.5,
      contrast: 1,
      percentage: 0,
    });
  }

  const primaryColor = selectPrimary(safeColors);
  const secondaryColor = selectSecondary(safeColors, primaryColor);
  const accentColor = selectAccent(safeColors, primaryColor, secondaryColor);

  const avgBrightness =
    safeColors.reduce((s, c) => s + c.brightness, 0) / safeColors.length;
  const isDarkMode = avgBrightness < 0.5;

  const primary = primaryColor.hex;
  const primaryLight = adjustBrightness(primary, 20);
  const primaryDark = adjustBrightness(primary, -20);

  const secondary = secondaryColor.hex;
  const secondaryLight = adjustBrightness(secondary, 20);

  const accent = accentColor.hex;

  const background = isDarkMode ? '#121212' : '#F8F9FA';
  const surface = isDarkMode
    ? mixColors(primary, '#1E1E1E', 0.08)
    : mixColors(primary, '#FFFFFF', 0.95);
  const surfaceHover = isDarkMode
    ? adjustBrightness(surface, 5)
    : adjustBrightness(surface, -3);

  const textPrimary = isDarkMode
    ? ensureContrast('#E0E0E0', surface, 6)
    : ensureContrast('#1A1A1A', surface, 6);
  const textSecondary = adjustBrightness(textPrimary, isDarkMode ? -20 : 20);
  const textMuted = adjustBrightness(textPrimary, isDarkMode ? -40 : 40);

  const border = isDarkMode
    ? mixColors(primary, '#333333', 0.15)
    : mixColors(primary, '#E0E0E0', 0.2);
  const borderLight = adjustBrightness(border, isDarkMode ? 10 : -5);

  const shadows = generateShadows(accent, isDarkMode);
  const fontFamily = pickFontFamily(safeColors);

  const variables: ThemeVariables = {
    '--primary': primary,
    '--primary-light': primaryLight,
    '--primary-dark': primaryDark,
    '--secondary': secondary,
    '--secondary-light': secondaryLight,
    '--accent': accent,
    '--background': background,
    '--surface': surface,
    '--surface-hover': surfaceHover,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--text-muted': textMuted,
    '--border': border,
    '--border-light': borderLight,
    '--shadow-0': shadows[0],
    '--shadow-1': shadows[1],
    '--shadow-2': shadows[2],
    '--shadow-3': shadows[3],
    '--shadow-4': shadows[4],
    '--radius-sm': '4px',
    '--radius-md': '8px',
    '--radius-lg': '16px',
    '--font-family': fontFamily,
  };

  const cssString = generateCSSString(variables);
  const scssString = generateSCSSString(variables);
  const tailwindConfig = generateTailwindConfig(variables);

  return {
    variables,
    cssString,
    scssString,
    tailwindConfig,
    colors: safeColors.slice(0, 5),
    timestamp: Date.now(),
    id: `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

export function generateCSSString(variables: ThemeVariables): string {
  const entries = Object.entries(variables);
  const inner = entries.map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `:root {\n${inner}\n}\n`;
}

export function generateSCSSString(variables: ThemeVariables): string {
  const entries = Object.entries(variables);
  return entries
    .map(([k, v]) => {
      const name = k.replace('--', '').replace(/-/g, '-');
      return `$${name}: ${v};`;
    })
    .join('\n') + '\n';
}

export function generateTailwindConfig(variables: ThemeVariables): string {
  const colorMap: Record<string, string> = {
    primary: '--primary',
    'primary-light': '--primary-light',
    'primary-dark': '--primary-dark',
    secondary: '--secondary',
    'secondary-light': '--secondary-light',
    accent: '--accent',
    background: '--background',
    surface: '--surface',
    'surface-hover': '--surface-hover',
    'text-primary': '--text-primary',
    'text-secondary': '--text-secondary',
    'text-muted': '--text-muted',
    border: '--border',
    'border-light': '--border-light',
  };

  const shadowMap: Record<string, string> = {
    '0': '--shadow-0',
    '1': '--shadow-1',
    '2': '--shadow-2',
    '3': '--shadow-3',
    '4': '--shadow-4',
  };

  const colors = Object.entries(colorMap)
    .map(
      ([k, v]) =>
        `      ${k}: 'var(${v})'`,
    )
    .join(',\n');

  const boxShadow = Object.entries(shadowMap)
    .map(
      ([k, v]) =>
        `      '${k}': 'var(${v})'`,
    )
    .join(',\n');

  const borderRadius = `      'sm': 'var(--radius-sm)',\n      'md': 'var(--radius-md)',\n      'lg': 'var(--radius-lg)'`;

  return `/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
${colors}
      },
      boxShadow: {
${boxShadow}
      },
      borderRadius: {
${borderRadius}
      },
      fontFamily: {
        theme: [\`\${variables['--font-family']}\`]
      }
    }
  }
}
`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
