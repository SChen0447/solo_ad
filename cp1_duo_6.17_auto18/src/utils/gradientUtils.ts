import type { ColorStop } from '../types';

export function generateGradientString(stops: ColorStop[], angle: number): string {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const colorStops = sortedStops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(', ');
  return `linear-gradient(${angle}deg, ${colorStops})`;
}

export function generateWebkitGradient(stops: ColorStop[], angle: number): string {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const colorStops = sortedStops
    .map((stop) => `color-stop(${stop.position}%, ${stop.color})`)
    .join(', ');
  return `-webkit-linear-gradient(${angle}deg, ${colorStops})`;
}

export function generateFullCSS(stops: ColorStop[], angle: number): string {
  const standard = generateGradientString(stops, angle);
  const webkit = generateWebkitGradient(stops, angle);
  return `${webkit};\nbackground: ${standard};`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
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
