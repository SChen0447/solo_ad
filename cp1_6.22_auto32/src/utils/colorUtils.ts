export function getCityColor(index: number): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  ];
  return colors[index % colors.length];
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 1, g: 1, b: 1 };
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

export function getCityThreeColor(index: number): { r: number; g: number; b: number } {
  return hexToRgb(getCityColor(index));
}

export function getCityColorCSS(index: number, alpha: number = 1): string {
  const hex = getCityColor(index);
  const rgb = hexToRgb(hex);
  return `rgba(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}, ${alpha})`;
}
