export interface ColorScheme {
  hex: string;
  name: string;
  h: number;
  s: number;
  l: number;
}

const BASE_HEX = '#006241';
const BASE_H = 160;
const BASE_S = 100;
const BASE_L = 19;

const COLOR_NAMES: string[] = [
  '森林晨露',
  '烘焙午后',
  '薄荷清风',
  '翡翠梦境',
  '苔藓深林',
  '橄榄时光',
  '青柠夏日',
  '松柏寒夜',
  '抹茶物语',
  '青瓷雅韵',
  '竹林幽径',
  '湖畔微光',
];

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

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
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
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

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

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

export function lightenColor(hex: string, percent: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newL = Math.min(100, l + percent);
  return hslToHex(h, s, newL);
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function generateColorSchemes(): ColorScheme[] {
  const schemes: ColorScheme[] = [];
  const hueOffsets = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90];
  const satVariations = [0, 0, 0, -10, -10, 10, 10, 0, 0, -10, -10, 10];

  for (let i = 0; i < 12; i++) {
    const h = (BASE_H + hueOffsets[i] + 360) % 360;
    const s = Math.max(70, Math.min(100, BASE_S + satVariations[i]));
    const l = BASE_L;
    const hex = hslToHex(h, s, l);

    schemes.push({
      hex,
      name: COLOR_NAMES[i],
      h,
      s,
      l,
    });
  }

  return schemes;
}

export function formatHex(hex: string): string {
  return hex.toUpperCase();
}
