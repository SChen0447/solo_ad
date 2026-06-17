import type { ColorStop } from '../types';

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}

type HarmonyMode = 'analogous' | 'complementary' | 'triadic' | 'split-complementary';

export function generateRandomGradient(): { stops: ColorStop[]; angle: number } {
  const numStops = Math.floor(Math.random() * 3) + 3;
  const baseHue = Math.floor(Math.random() * 360);
  const modes: HarmonyMode[] = ['analogous', 'complementary', 'triadic', 'split-complementary'];
  const mode = modes[Math.floor(Math.random() * modes.length)];

  const baseSaturation = 0.6 + Math.random() * 0.3;
  const baseLightness = 0.45 + Math.random() * 0.2;

  const hues: number[] = [];

  switch (mode) {
    case 'analogous':
      for (let i = 0; i < numStops; i++) {
        const offset = (i - (numStops - 1) / 2) * 25;
        hues.push((baseHue + offset + 360) % 360);
      }
      break;

    case 'complementary':
      const complement = (baseHue + 180) % 360;
      for (let i = 0; i < numStops; i++) {
        const t = i / (numStops - 1);
        const hue = baseHue + (complement - baseHue) * t;
        hues.push(((hue % 360) + 360) % 360);
      }
      break;

    case 'triadic':
      const triadOffsets = [0, 120, 240];
      for (let i = 0; i < numStops; i++) {
        const baseIdx = i % 3;
        const variation = (Math.random() - 0.5) * 20;
        hues.push((baseHue + triadOffsets[baseIdx] + variation + 360) % 360);
      }
      break;

    case 'split-complementary':
      const splitHues = [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360];
      for (let i = 0; i < numStops; i++) {
        const baseIdx = i % 3;
        const variation = (Math.random() - 0.5) * 15;
        hues.push((splitHues[baseIdx] + variation + 360) % 360);
      }
      break;
  }

  const stops: ColorStop[] = hues
    .slice(0, numStops)
    .map((hue, index) => {
      const saturation = Math.min(1, Math.max(0.5, baseSaturation + (Math.random() - 0.5) * 0.2));
      const lightness = Math.min(0.85, Math.max(0.35, baseLightness + (Math.random() - 0.5) * 0.15));
      return {
        id: generateId(),
        color: hslToHex(hue, saturation, lightness),
        position: Math.round((index / (numStops - 1)) * 100),
      };
    })
    .sort((a, b) => a.position - b.position);

  const angle = Math.floor(Math.random() * 360);

  return { stops, angle };
}

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
