function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
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

export function interpolateColor(startHex: string, endHex: string, t: number): string {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const clampedT = Math.max(0, Math.min(1, t));

  return rgbToHex(
    start.r + (end.r - start.r) * clampedT,
    start.g + (end.g - start.g) * clampedT,
    start.b + (end.b - start.b) * clampedT
  );
}

export function getCertificationBorderColor(level: number): string {
  const green = '#10B981';
  const purple = '#8B5CF6';
  const minLevel = 1;
  const maxLevel = 5;

  if (typeof level !== 'number' || isNaN(level) || level < minLevel) {
    return green;
  }

  const clampedLevel = Math.min(level, maxLevel);
  const t = (clampedLevel - minLevel) / (maxLevel - minLevel);
  return interpolateColor(green, purple, t);
}

export function getAvatarGradient(level: number): string {
  const color = getCertificationBorderColor(level);
  return color;
}
