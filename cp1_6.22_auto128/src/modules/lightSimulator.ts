import type { LightConfig } from '@/types';

interface ColorStop {
  hour: number;
  color: string;
}

interface SunPosition {
  hour: number;
  position: [number, number, number];
}

const SUN_COLOR_STOPS: ColorStop[] = [
  { hour: 0, color: '#1a1a40' },
  { hour: 5, color: '#1a1a40' },
  { hour: 6, color: '#ff9a56' },
  { hour: 8, color: '#fcd34d' },
  { hour: 10, color: '#ffffff' },
  { hour: 14, color: '#ffffff' },
  { hour: 17, color: '#fbbf24' },
  { hour: 18, color: '#f97316' },
  { hour: 19, color: '#1a1a40' },
  { hour: 24, color: '#1a1a40' },
];

const AMBIENT_COLOR_STOPS: ColorStop[] = [
  { hour: 0, color: '#0d1b2a' },
  { hour: 5, color: '#0d1b2a' },
  { hour: 6, color: '#334155' },
  { hour: 8, color: '#e2e8f0' },
  { hour: 10, color: '#ffffff' },
  { hour: 14, color: '#ffffff' },
  { hour: 17, color: '#fde68a' },
  { hour: 18, color: '#7c2d12' },
  { hour: 19, color: '#0d1b2a' },
  { hour: 24, color: '#0d1b2a' },
];

const SUN_POSITION_STOPS: SunPosition[] = [
  { hour: 5, position: [-12, 0.2, -8] },
  { hour: 6, position: [-10, 2, -6] },
  { hour: 8, position: [-6, 7, -3] },
  { hour: 10, position: [-3, 10, -1] },
  { hour: 12, position: [0, 12, 0] },
  { hour: 14, position: [3, 10, 1] },
  { hour: 16, position: [6, 7, 3] },
  { hour: 18, position: [10, 2, 6] },
  { hour: 19, position: [12, 0.2, 8] },
];

const SUN_INTENSITY_STOPS: { hour: number; intensity: number }[] = [
  { hour: 0, intensity: 0.0 },
  { hour: 5, intensity: 0.0 },
  { hour: 6, intensity: 0.4 },
  { hour: 8, intensity: 1.2 },
  { hour: 10, intensity: 2.0 },
  { hour: 14, intensity: 2.0 },
  { hour: 17, intensity: 1.0 },
  { hour: 18, intensity: 0.5 },
  { hour: 19, intensity: 0.0 },
  { hour: 24, intensity: 0.0 },
];

const AMBIENT_INTENSITY_STOPS: { hour: number; intensity: number }[] = [
  { hour: 0, intensity: 0.15 },
  { hour: 5, intensity: 0.15 },
  { hour: 6, intensity: 0.35 },
  { hour: 8, intensity: 0.7 },
  { hour: 10, intensity: 0.9 },
  { hour: 14, intensity: 0.9 },
  { hour: 17, intensity: 0.6 },
  { hour: 18, intensity: 0.3 },
  { hour: 19, intensity: 0.15 },
  { hour: 24, intensity: 0.15 },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.min(255, Math.max(0, Math.round(v * 255))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerpColor(stops: ColorStop[], hour: number): string {
  if (hour <= stops[0].hour) return stops[0].color;
  if (hour >= stops[stops.length - 1].hour) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    const cur = stops[i];
    const next = stops[i + 1];
    if (hour >= cur.hour && hour <= next.hour) {
      const t = (hour - cur.hour) / (next.hour - cur.hour);
      const c1 = hexToRgb(cur.color);
      const c2 = hexToRgb(next.color);
      return rgbToHex(c1.r + (c2.r - c1.r) * t, c1.g + (c2.g - c1.g) * t, c1.b + (c2.b - c1.b) * t);
    }
  }
  return '#ffffff';
}

function lerpNumeric<T extends { hour: number }>(
  stops: T[],
  hour: number,
  key: keyof Omit<T, 'hour'>,
): number {
  if (hour <= stops[0].hour) return stops[0][key] as number;
  if (hour >= stops[stops.length - 1].hour) return stops[stops.length - 1][key] as number;

  for (let i = 0; i < stops.length - 1; i++) {
    const cur = stops[i];
    const next = stops[i + 1];
    if (hour >= cur.hour && hour <= next.hour) {
      const t = (hour - cur.hour) / (next.hour - cur.hour);
      const c1 = cur[key] as number;
      const c2 = next[key] as number;
      return c1 + (c2 - c1) * t;
    }
  }
  return 0;
}

function lerpPosition(stops: SunPosition[], hour: number): [number, number, number] {
  if (hour <= stops[0].hour) return stops[0].position;
  if (hour >= stops[stops.length - 1].hour) return stops[stops.length - 1].position;

  for (let i = 0; i < stops.length - 1; i++) {
    const cur = stops[i];
    const next = stops[i + 1];
    if (hour >= cur.hour && hour <= next.hour) {
      const t = (hour - cur.hour) / (next.hour - cur.hour);
      return [
        cur.position[0] + (next.position[0] - cur.position[0]) * t,
        cur.position[1] + (next.position[1] - cur.position[1]) * t,
        cur.position[2] + (next.position[2] - cur.position[2]) * t,
      ];
    }
  }
  return [0, 10, 0];
}

export function calculateLightConfig(hour: number): LightConfig {
  const clampedHour = Math.max(0, Math.min(24, hour));

  return {
    sunPosition: lerpPosition(SUN_POSITION_STOPS, clampedHour),
    sunColor: lerpColor(SUN_COLOR_STOPS, clampedHour),
    sunIntensity: lerpNumeric(SUN_INTENSITY_STOPS, clampedHour, 'intensity' as keyof (typeof SUN_INTENSITY_STOPS)[number]),
    ambientColor: lerpColor(AMBIENT_COLOR_STOPS, clampedHour),
    ambientIntensity: lerpNumeric(
      AMBIENT_INTENSITY_STOPS,
      clampedHour,
      'intensity' as keyof (typeof AMBIENT_INTENSITY_STOPS)[number],
    ),
    shadowMapSize: 2048,
  };
}

export function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getLightIntensityPercent(hour: number): number {
  const intensity = lerpNumeric(SUN_INTENSITY_STOPS, Math.max(0, Math.min(24, hour)), 'intensity' as keyof (typeof SUN_INTENSITY_STOPS)[number]);
  const maxIntensity = 2.0;
  return Math.round((intensity / maxIntensity) * 100);
}
