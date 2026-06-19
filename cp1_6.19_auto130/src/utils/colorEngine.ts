import { colord, extend } from 'colord';
import names from 'colord/plugins/names';
import harmonies from 'colord/plugins/harmonies';
import mix from 'colord/plugins/mix';
import type { Color, Palette, PaletteType, RGB, HSL } from '../types/colors';
import { v4 as uuidv4 } from 'uuid';

extend([names, harmonies, mix]);

const PALETTE_NAMES: Record<PaletteType, string> = {
  analogous: '同色系渐变',
  complementary: '互补色',
  triadic: '三角色',
  tetradic: '四角色',
  monochromatic: '单色明度变化',
};

function hexToRgb(hex: string): RGB {
  const c = colord(hex).toRgb();
  return { r: c.r, g: c.g, b: c.b };
}

function hexToHsl(hex: string): HSL {
  const c = colord(hex).toHsl();
  return { h: Math.round(c.h), s: Math.round(c.s), l: Math.round(c.l) };
}

function getColorName(hex: string): string {
  const c = colord(hex);
  const name = c.toName({ closest: true });
  return name || hex;
}

export function createColor(hex: string): Color {
  const normalizedHex = colord(hex).toHex();
  return {
    hex: normalizedHex.toUpperCase(),
    rgb: hexToRgb(normalizedHex),
    hsl: hexToHsl(normalizedHex),
    name: getColorName(normalizedHex),
  };
}

export function adjustBrightness(hex: string, amount: number): Color {
  const result = colord(hex).lighten(amount / 100);
  return createColor(result.toHex());
}

export function adjustSaturation(hex: string, amount: number): Color {
  const result = colord(hex).saturate(amount / 100);
  return createColor(result.toHex());
}

export function adjustHue(hex: string, degrees: number): Color {
  const result = colord(hex).rotate(degrees);
  return createColor(result.toHex());
}

function generateAnalogous(primary: Color): Color[] {
  const base = colord(primary.hex);
  const colors: Color[] = [primary];
  const angles = [-30, -15, 15, 30];
  angles.forEach((angle) => {
    colors.push(createColor(base.rotate(angle).toHex()));
  });
  return colors;
}

function generateComplementary(primary: Color): Color[] {
  const base = colord(primary.hex);
  const colors: Color[] = [primary];
  const complement = base.rotate(180);
  colors.push(createColor(complement.toHex()));
  colors.push(createColor(base.mix(complement, 0.25).toHex()));
  colors.push(createColor(base.mix(complement, 0.5).toHex()));
  colors.push(createColor(base.mix(complement, 0.75).toHex()));
  return colors;
}

function generateTriadic(primary: Color): Color[] {
  const base = colord(primary.hex);
  const colors: Color[] = [primary];
  colors.push(createColor(base.rotate(120).toHex()));
  colors.push(createColor(base.rotate(240).toHex()));
  colors.push(createColor(base.rotate(60).toHex()));
  colors.push(createColor(base.rotate(300).toHex()));
  return colors;
}

function generateTetradic(primary: Color): Color[] {
  const base = colord(primary.hex);
  const colors: Color[] = [primary];
  colors.push(createColor(base.rotate(90).toHex()));
  colors.push(createColor(base.rotate(180).toHex()));
  colors.push(createColor(base.rotate(270).toHex()));
  colors.push(createColor(base.rotate(45).toHex()));
  return colors;
}

function generateMonochromatic(primary: Color): Color[] {
  const base = colord(primary.hex);
  const colors: Color[] = [];
  const lightnessSteps = [-30, -15, 0, 15, 30];
  lightnessSteps.forEach((step) => {
    colors.push(createColor(base.lighten(step / 100).toHex()));
  });
  return colors;
}

export function generatePalette(primaryHex: string, type: PaletteType): Palette {
  const primary = createColor(primaryHex);
  let colors: Color[];

  switch (type) {
    case 'analogous':
      colors = generateAnalogous(primary);
      break;
    case 'complementary':
      colors = generateComplementary(primary);
      break;
    case 'triadic':
      colors = generateTriadic(primary);
      break;
    case 'tetradic':
      colors = generateTetradic(primary);
      break;
    case 'monochromatic':
      colors = generateMonochromatic(primary);
      break;
    default:
      colors = [primary];
  }

  return {
    id: uuidv4(),
    name: PALETTE_NAMES[type],
    primary,
    colors,
    type,
    createdAt: Date.now(),
  };
}

export function generateAllPalettes(primaryHex: string): Palette[] {
  const types: PaletteType[] = ['analogous', 'complementary', 'triadic', 'tetradic', 'monochromatic'];
  return types.map((type) => generatePalette(primaryHex, type));
}

export async function extractColors(imageFile: File, count: number = 5): Promise<Color[]> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('无法获取Canvas上下文'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      const maxSize = 200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      const colorMap = new Map<string, number>();

      for (let i = 0; i < pixels.length; i += 4) {
        const r = Math.round(pixels[i] / 16) * 16;
        const g = Math.round(pixels[i + 1] / 16) * 16;
        const b = Math.round(pixels[i + 2] / 16) * 16;
        const a = pixels[i + 3];

        if (a < 128) continue;

        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count * 3);

      const selectedColors: Color[] = [];
      const minDistance = 60;

      for (const [key] of sortedColors) {
        if (selectedColors.length >= count) break;

        const [r, g, b] = key.split(',').map(Number);
        const hex = colord({ r, g, b }).toHex();

        const isDistinct = selectedColors.every((c) => {
          const dr = c.rgb.r - r;
          const dg = c.rgb.g - g;
          const db = c.rgb.b - b;
          return Math.sqrt(dr * dr + dg * dg + db * db) > minDistance;
        });

        if (isDistinct) {
          selectedColors.push(createColor(hex));
        }
      }

      if (selectedColors.length < count) {
        for (const [key] of sortedColors) {
          if (selectedColors.length >= count) break;
          const [r, g, b] = key.split(',').map(Number);
          const hex = colord({ r, g, b }).toHex();
          const color = createColor(hex);
          if (!selectedColors.some((c) => c.hex === color.hex)) {
            selectedColors.push(color);
          }
        }
      }

      resolve(selectedColors.slice(0, count));
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(imageFile);
  });
}

export function getContrastColor(hex: string): string {
  const c = colord(hex);
  return c.isDark() ? '#ffffff' : '#000000';
}

export function isLightColor(hex: string): boolean {
  return colord(hex).isLight();
}

export function generateCSSVariables(colors: Color[], prefix: string = 'color'): string {
  return colors
    .map((color, index) => `--${prefix}-${index + 1}: ${color.hex};`)
    .join('\n');
}
