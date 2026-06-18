import {
  scaleLinear,
  scaleSequential,
  interpolateViridis,
  interpolatePlasma,
  interpolateCool,
  interpolateWarm,
  interpolateRainbow
} from 'd3-scale-chromatic';
import { scaleOrdinal } from 'd3-scale';
import * as d3color from 'd3-color';
import type { Particle, FieldInfo, MappingConfig, Filters, ColorScheme } from '@/types';

const INTERPOLATORS: Record<ColorScheme, (t: number) => string> = {
  viridis: interpolateViridis,
  plasma: interpolatePlasma,
  cool: interpolateCool,
  warm: interpolateWarm,
  rainbow: interpolateRainbow
};

export function calculateParticleProperties(
  particles: Particle[],
  fields: FieldInfo[],
  mapping: MappingConfig,
  filters: Filters
): Particle[] {
  const fieldMap = new Map(fields.map(f => [f.name, f]));

  const xField = fieldMap.get(mapping.xAxis);
  const yField = fieldMap.get(mapping.yAxis);
  const zField = fieldMap.get(mapping.zAxis);
  const colorField = fieldMap.get(mapping.colorField);
  const sizeField = fieldMap.get(mapping.sizeField);

  const [posMin, posMax] = mapping.positionRange;
  const posScale = (v: number, min: number, max: number) => {
    if (max === min) return 0;
    const t = (v - min) / (max - min);
    return posMin + t * (posMax - posMin);
  };

  const [sizeMin, sizeMax] = mapping.sizeRange;
  const sizeScaleFn = (v: number, min: number, max: number) => {
    if (max === min) return (sizeMin + sizeMax) / 2;
    const t = (v - min) / (max - min);
    return sizeMin + t * (sizeMax - sizeMin);
  };

  const colorInterpolator = INTERPOLATORS[mapping.colorScheme] || interpolateViridis;

  let categoricalColorScale: any = null;
  if (colorField && colorField.type === 'categorical' && colorField.categories) {
    const cats = colorField.categories;
    const catColors = cats.map((_, i) => colorInterpolator(i / Math.max(cats.length - 1, 1)));
    categoricalColorScale = scaleOrdinal<string>().domain(cats).range(catColors);
  }

  return particles.map(p => {
    const raw = p.rawData;

    let tx = 0, ty = 0, tz = 0;

    if (xField && xField.type === 'numeric' && xField.min !== undefined && xField.max !== undefined) {
      const xv = Number(raw[xField.name]);
      tx = isNaN(xv) ? 0 : posScale(xv, xField.min, xField.max);
    } else {
      tx = (Math.sin(p.index * 12.9898) * 43758.5453 % 1) * (posMax - posMin);
    }

    if (yField && yField.type === 'numeric' && yField.min !== undefined && yField.max !== undefined) {
      const yv = Number(raw[yField.name]);
      ty = isNaN(yv) ? 0 : posScale(yv, yField.min, yField.max);
    } else {
      ty = (Math.sin(p.index * 78.233) * 43758.5453 % 1) * (posMax - posMin);
    }

    if (zField && zField.type === 'numeric' && zField.min !== undefined && zField.max !== undefined) {
      const zv = Number(raw[zField.name]);
      tz = isNaN(zv) ? 0 : posScale(zv, zField.min, zField.max);
    } else {
      tz = (Math.sin(p.index * 45.164) * 43758.5453 % 1) * (posMax - posMin);
    }

    let tColor = '#7cb3ff';
    if (colorField) {
      const cv = raw[colorField.name];
      if (colorField.type === 'numeric' && colorField.min !== undefined && colorField.max !== undefined) {
        const cnv = Number(cv);
        if (!isNaN(cnv)) {
          const t = colorField.max === colorField.min ? 0.5 : (cnv - colorField.min) / (colorField.max - colorField.min);
          tColor = colorInterpolator(Math.max(0, Math.min(1, t)));
        }
      } else if (colorField.type === 'categorical' && categoricalColorScale) {
        tColor = categoricalColorScale(String(cv)) || '#7cb3ff';
      }
    }

    let tSize = 1.0;
    if (sizeField && sizeField.type === 'numeric' && sizeField.min !== undefined && sizeField.max !== undefined) {
      const sv = Number(raw[sizeField.name]);
      if (!isNaN(sv)) {
        tSize = sizeScaleFn(sv, sizeField.min, sizeField.max);
      }
    }

    let visible = true;
    for (const [fieldName, range] of Object.entries(filters)) {
      const fInfo = fieldMap.get(fieldName);
      if (!fInfo || fInfo.type !== 'numeric') continue;
      const val = Number(raw[fieldName]);
      if (isNaN(val) || val < range.min || val > range.max) {
        visible = false;
        break;
      }
    }

    return {
      ...p,
      targetPosition: [tx, ty, tz],
      targetColor: tColor,
      targetSize: tSize,
      targetVisible: visible
    };
  });
}

export function hexToRgb(hex: string): [number, number, number] {
  const c = d3color.rgb(hex);
  return [c.r / 255, c.g / 255, c.b / 255];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function lerpColor(hexA: string, hexB: string, t: number): string {
  const a = d3color.rgb(hexA);
  const b = d3color.rgb(hexB);
  const c = d3color.rgb(
    Math.round(lerp(a.r, b.r, t)),
    Math.round(lerp(a.g, b.g, t)),
    Math.round(lerp(a.b, b.b, t))
  );
  return c.formatHex();
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
