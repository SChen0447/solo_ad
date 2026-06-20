import chroma from 'chroma-js';

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorToken {
  hex: string;
  name: string;
  key: string;
  category: 'primary' | 'secondary' | 'neutral' | 'functional';
}

export interface PaletteVariants {
  primaryShades: string[];
  primarySaturations: string[];
}

export interface ColorPaletteData {
  primary: ColorToken;
  secondary: [ColorToken, ColorToken];
  neutral: {
    darkGray: ColorToken;
    lightGray: ColorToken;
    white: ColorToken;
  };
  functional: {
    success: ColorToken;
    warning: ColorToken;
    error: ColorToken;
  };
  variants: PaletteVariants;
}

export function hexToHsl(hex: string): HSL {
  try {
    const [h, s, l] = chroma(hex).hsl();
    return {
      h: isNaN(h) ? 0 : Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  } catch {
    return { h: 0, s: 0, l: 50 };
  }
}

export function hslToHex(hsl: HSL): string {
  try {
    return chroma(hsl.h, hsl.s / 100, hsl.l / 100, 'hsl').hex().toUpperCase();
  } catch {
    return '#000000';
  }
}

export function generateShades(baseHex: string, count: number = 5): string[] {
  try {
    const shades: string[] = [];
    const baseL = chroma(baseHex).hsl()[2];
    const offsets = [-0.3, -0.15, 0, 0.15, 0.3];
    const sliceCount = Math.min(count, offsets.length);
    for (let i = 0; i < sliceCount; i++) {
      const newL = Math.max(0.05, Math.min(0.95, baseL + offsets[i]));
      const [h, s] = chroma(baseHex).hsl();
      shades.push(chroma(isNaN(h) ? 0 : h, s, newL, 'hsl').hex().toUpperCase());
    }
    return shades;
  } catch {
    return [baseHex];
  }
}

export function generateSaturations(baseHex: string, count: number = 4): string[] {
  try {
    const [h, s, l] = chroma(baseHex).hsl();
    const safeH = isNaN(h) ? 0 : h;
    const sats: string[] = [];
    const satLevels = [0, 0.33, 0.66, 1];
    const sliceCount = Math.min(count, satLevels.length);
    for (let i = 0; i < sliceCount; i++) {
      sats.push(chroma(safeH, s * satLevels[i], l, 'hsl').hex().toUpperCase());
    }
    return sats;
  } catch {
    return [baseHex];
  }
}

export function getContrastText(bgHex: string): string {
  try {
    const whiteContrast = chroma.contrast(bgHex, '#FFFFFF');
    const blackContrast = chroma.contrast(bgHex, '#000000');
    if (whiteContrast >= 4.5) return '#FFFFFF';
    if (blackContrast >= 4.5) return '#000000';
    return whiteContrast >= blackContrast ? '#FFFFFF' : '#000000';
  } catch {
    return '#000000';
  }
}

export function generateVariants(primaryHex: string): PaletteVariants {
  return {
    primaryShades: generateShades(primaryHex, 5),
    primarySaturations: generateSaturations(primaryHex, 4)
  };
}

export function buildDefaultPalette(): ColorPaletteData {
  const primary = '#4A90D9';
  return {
    primary: { hex: primary, name: '主色', key: 'primary', category: 'primary' },
    secondary: [
      { hex: '#9B59B6', name: '辅色1', key: 'secondary1', category: 'secondary' },
      { hex: '#1ABC9C', name: '辅色2', key: 'secondary2', category: 'secondary' }
    ],
    neutral: {
      darkGray: { hex: '#34495E', name: '深灰', key: 'darkGray', category: 'neutral' },
      lightGray: { hex: '#BDC3C7', name: '浅灰', key: 'lightGray', category: 'neutral' },
      white: { hex: '#FFFFFF', name: '白色', key: 'white', category: 'neutral' }
    },
    functional: {
      success: { hex: '#27AE60', name: '成功', key: 'success', category: 'functional' },
      warning: { hex: '#F39C12', name: '警告', key: 'warning', category: 'functional' },
      error: { hex: '#E74C3C', name: '错误', key: 'error', category: 'functional' }
    },
    variants: generateVariants(primary)
  };
}

export function darkenColor(hex: string, amount: number = 0.1): string {
  try {
    return chroma(hex).darken(amount).hex().toUpperCase();
  } catch {
    return hex;
  }
}

export function lightenColor(hex: string, amount: number = 0.1): string {
  try {
    return chroma(hex).brighten(amount).hex().toUpperCase();
  } catch {
    return hex;
  }
}

export function withAlpha(hex: string, alpha: number): string {
  try {
    return chroma(hex).alpha(alpha).css();
  } catch {
    return hex;
  }
}

export function exportCSSVars(palette: ColorPaletteData): string {
  const lines: string[] = [];
  lines.push(':root {');
  lines.push('  /* ============================================ */');
  lines.push('  /*   主色 Primary Color                        */');
  lines.push('  /* ============================================ */');
  lines.push(`  --color-primary: ${palette.primary.hex};`);
  palette.variants.primaryShades.forEach((shade, i) => {
    lines.push(`  --color-primary-shade-${i + 1}: ${shade};`);
  });
  palette.variants.primarySaturations.forEach((sat, i) => {
    lines.push(`  --color-primary-sat-${i + 1}: ${sat};`);
  });
  lines.push('');
  lines.push('  /* ============================================ */');
  lines.push('  /*   辅色 Secondary Colors                      */');
  lines.push('  /* ============================================ */');
  palette.secondary.forEach((c, i) => {
    lines.push(`  --color-secondary-${i + 1}: ${c.hex};`);
  });
  lines.push('');
  lines.push('  /* ============================================ */');
  lines.push('  /*   中性色 Neutral Colors                      */');
  lines.push('  /* ============================================ */');
  lines.push(`  --color-neutral-dark: ${palette.neutral.darkGray.hex};`);
  lines.push(`  --color-neutral-light: ${palette.neutral.lightGray.hex};`);
  lines.push(`  --color-neutral-white: ${palette.neutral.white.hex};`);
  lines.push('');
  lines.push('  /* ============================================ */');
  lines.push('  /*   功能色 Functional Colors                   */');
  lines.push('  /* ============================================ */');
  lines.push(`  --color-success: ${palette.functional.success.hex};`);
  lines.push(`  --color-warning: ${palette.functional.warning.hex};`);
  lines.push(`  --color-error: ${palette.functional.error.hex};`);
  lines.push('');
  lines.push('  /* ============================================ */');
  lines.push('  /*   对比度建议 Contrast Text Colors            */');
  lines.push('  /* ============================================ */');
  lines.push(`  --color-on-primary: ${getContrastText(palette.primary.hex)};`);
  lines.push(`  --color-on-success: ${getContrastText(palette.functional.success.hex)};`);
  lines.push(`  --color-on-warning: ${getContrastText(palette.functional.warning.hex)};`);
  lines.push(`  --color-on-error: ${getContrastText(palette.functional.error.hex)};`);
  lines.push('}');
  return lines.join('\n');
}

export function getAllTokens(palette: ColorPaletteData): ColorToken[] {
  const tokens: ColorToken[] = [];
  tokens.push(palette.primary);
  palette.secondary.forEach(s => tokens.push(s));
  tokens.push(palette.neutral.darkGray);
  tokens.push(palette.neutral.lightGray);
  tokens.push(palette.neutral.white);
  tokens.push(palette.functional.success);
  tokens.push(palette.functional.warning);
  tokens.push(palette.functional.error);
  return tokens;
}

export function updateTokenByKey(
  palette: ColorPaletteData,
  key: string,
  newHex: string
): ColorPaletteData {
  const next: ColorPaletteData = JSON.parse(JSON.stringify(palette));
  const upperHex = newHex.toUpperCase();
  if (next.primary.key === key) {
    next.primary.hex = upperHex;
    next.variants = generateVariants(upperHex);
  } else if (next.secondary[0].key === key) {
    next.secondary[0].hex = upperHex;
  } else if (next.secondary[1].key === key) {
    next.secondary[1].hex = upperHex;
  } else if (next.neutral.darkGray.key === key) {
    next.neutral.darkGray.hex = upperHex;
  } else if (next.neutral.lightGray.key === key) {
    next.neutral.lightGray.hex = upperHex;
  } else if (next.neutral.white.key === key) {
    next.neutral.white.hex = upperHex;
  } else if (next.functional.success.key === key) {
    next.functional.success.hex = upperHex;
  } else if (next.functional.warning.key === key) {
    next.functional.warning.hex = upperHex;
  } else if (next.functional.error.key === key) {
    next.functional.error.hex = upperHex;
  }
  return next;
}

export function findTokenByKey(palette: ColorPaletteData, key: string): ColorToken | undefined {
  return getAllTokens(palette).find(t => t.key === key);
}
