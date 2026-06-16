import { RGB, HSL, ColorInfo, Palette } from './types';

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return ('#' + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): HSL {
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
    l: Math.round(l * 100)
  };
}

function hslToRgb(h: number, s: number, l: number): RGB {
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
    b: Math.round(b * 255)
  };
}

function rgbDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getColorName(hsl: HSL, rgb: RGB): string {
  const { h, s, l } = hsl;

  if (l < 10) return '纯黑色';
  if (l > 92) return '纯白色';
  if (s < 8) {
    if (l < 35) return '深灰色';
    if (l < 65) return '中灰色';
    return '浅灰色';
  }

  if (h < 15 || h >= 345) return s > 60 ? '砖红色' : '豆沙色';
  if (h < 40) return s > 60 ? '橙色' : '驼色';
  if (h < 65) return s > 60 ? '金黄色' : '米黄色';
  if (h < 95) return s > 60 ? '嫩绿色' : '淡黄绿色';
  if (h < 150) return s > 60 ? '翠绿色' : '薄荷绿';
  if (h < 175) return s > 60 ? '蓝绿色' : '淡青色';
  if (h < 200) return s > 60 ? '天蓝色' : '淡蓝色';
  if (h < 240) return s > 60 ? '宝蓝色' : '灰蓝色';
  if (h < 280) return s > 60 ? '紫色' : '淡紫色';
  if (h < 320) return s > 60 ? '洋红色' : '粉紫色';
  return s > 60 ? '玫红色' : '浅粉色';
}

export function rgbToColorInfo(
  rgb: RGB,
  percentage: number = 0
): ColorInfo {
  return {
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    rgb,
    hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
    percentage
  };
}

export function hslToColorInfo(
  hsl: HSL,
  percentage: number = 0
): ColorInfo {
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return {
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    rgb,
    hsl,
    percentage
  };
}

export function analyzeColors(imageData: ImageData, k: number = 5): Promise<Palette> {
  return new Promise((resolve) => {
    const runAnalysis = () => {
      const data = imageData.data;
      const pixels: RGB[] = [];
      const step = Math.max(1, Math.floor(data.length / (4 * 8000)));

      for (let i = 0; i < data.length; i += 4 * step) {
        const a = data[i + 3];
        if (a < 128) continue;
        pixels.push({
          r: data[i],
          g: data[i + 1],
          b: data[i + 2]
        });
      }

      if (pixels.length === 0) {
        resolve([]);
        return;
      }

      const centroids: RGB[] = [];
      const usedIndices = new Set<number>();
      for (let i = 0; i < k && i < pixels.length; i++) {
        let idx: number;
        do {
          idx = Math.floor(Math.random() * pixels.length);
        } while (usedIndices.has(idx) && usedIndices.size < pixels.length);
        usedIndices.add(idx);
        centroids.push({ ...pixels[idx] });
      }

      const maxIterations = 15;
      const threshold = 2;
      let iterations = 0;
      let converged = false;

      while (!converged && iterations < maxIterations) {
        iterations++;

        const clusters: RGB[][] = centroids.map(() => []);
        for (const pixel of pixels) {
          let minDist = Infinity;
          let minIdx = 0;
          for (let j = 0; j < centroids.length; j++) {
            const dist = rgbDistance(pixel, centroids[j]);
            if (dist < minDist) {
              minDist = dist;
              minIdx = j;
            }
          }
          clusters[minIdx].push(pixel);
        }

        converged = true;
        for (let j = 0; j < centroids.length; j++) {
          if (clusters[j].length === 0) continue;

          const sum = clusters[j].reduce(
            (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
            { r: 0, g: 0, b: 0 }
          );
          const newCentroid: RGB = {
            r: Math.round(sum.r / clusters[j].length),
            g: Math.round(sum.g / clusters[j].length),
            b: Math.round(sum.b / clusters[j].length)
          };

          if (rgbDistance(centroids[j], newCentroid) > threshold) {
            converged = false;
          }
          centroids[j] = newCentroid;
        }
      }

      const finalClusters: RGB[][] = centroids.map(() => []);
      for (const pixel of pixels) {
        let minDist = Infinity;
        let minIdx = 0;
        for (let j = 0; j < centroids.length; j++) {
          const dist = rgbDistance(pixel, centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            minIdx = j;
          }
        }
        finalClusters[minIdx].push(pixel);
      }

      const totalPixels = pixels.length;
      const result: Palette = centroids
        .map((centroid, idx) => {
          const count = finalClusters[idx].length;
          const percentage = Math.round((count / totalPixels) * 1000) / 10;
          const info = rgbToColorInfo(centroid, percentage);
          info.name = getColorName(info.hsl, info.rgb);
          return info;
        })
        .filter((_, idx) => finalClusters[idx].length > 0)
        .sort((a, b) => b.percentage - a.percentage);

      resolve(result);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runAnalysis, { timeout: 3000 });
    } else {
      setTimeout(runAnalysis, 0);
    }
  });
}
