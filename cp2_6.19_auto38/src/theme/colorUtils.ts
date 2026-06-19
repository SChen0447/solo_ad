export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function getRelativeLuminance(rgb: RGB): number {
  const { r, g, b } = rgb;
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const R = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const G = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const B = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(hexToRgb(color1));
  const l2 = getRelativeLuminance(hexToRgb(color2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function adjustBrightness(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function lighten(hex: string, percent: number): string {
  return adjustBrightness(hex, percent);
}

export function darken(hex: string, percent: number): string {
  return adjustBrightness(hex, -percent);
}

export function ensureContrast(
  foreground: string,
  background: string,
  minRatio: number = 4.5
): string {
  let currentRatio = getContrastRatio(foreground, background);
  let result = foreground;
  let iterations = 0;

  while (currentRatio < minRatio && iterations < 50) {
    const bgLuminance = getRelativeLuminance(hexToRgb(background));
    if (bgLuminance > 0.5) {
      result = darken(result, 5);
    } else {
      result = lighten(result, 5);
    }
    currentRatio = getContrastRatio(result, background);
    iterations++;
  }

  return result;
}

export function getTextColor(background: string): string {
  const luminance = getRelativeLuminance(hexToRgb(background));
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

export function createGradient(color1: string, color2: string): string {
  return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
}

export function hexWithOpacity(hex: string, opacity: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
