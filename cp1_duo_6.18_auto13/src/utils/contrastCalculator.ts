export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContrastMetrics {
  avgDeltaE: number;
  wcagContrastDiff: number;
  diffRegions: DiffRegion[];
  heatmapData: Uint8ClampedArray;
}

function sRGBToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBToLinear(r) + 0.7152 * sRGBToLinear(g) + 0.0722 * sRGBToLinear(b);
}

export function wcagContrast(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function labF(t: number): number {
  return t > 0.008856 ? Math.pow(t, 1 / 3) : (903.3 * t + 16) / 116;
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = sRGBToLinear(r);
  const lg = sRGBToLinear(g);
  const lb = sRGBToLinear(b);

  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const fx = labF(x / xn);
  const fy = labF(y / yn);
  const fz = labF(z / zn);

  const L = 116 * fy - 16;
  const A = 500 * (fx - fy);
  const B = 200 * (fy - fz);

  return [L, A, B];
}

export function calculateDeltaE(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  const [L1, A1, B1] = rgbToLab(r1, g1, b1);
  const [L2, A2, B2] = rgbToLab(r2, g2, b2);
  return Math.sqrt(
    (L2 - L1) ** 2 + (A2 - A1) ** 2 + (B2 - B1) ** 2
  );
}

export function analyzeContrast(
  original: ImageData,
  simulated: ImageData,
  threshold: number = 0.05
): ContrastMetrics {
  const { width, height } = original;
  const totalPixels = width * height;
  let totalDeltaE = 0;
  let totalContrastDiff = 0;

  const heatmapData = new Uint8ClampedArray(totalPixels * 4);
  const blockSize = 8;
  const diffRegions: DiffRegion[] = [];

  for (let y = 0; y < height; y += blockSize) {
    for (let x = 0; x < width; x += blockSize) {
      let blockDeltaE = 0;
      let blockPixels = 0;

      for (let by = 0; by < blockSize && y + by < height; by++) {
        for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
          const idx = ((y + by) * width + (x + bx)) * 4;
          const oR = original.data[idx];
          const oG = original.data[idx + 1];
          const oB = original.data[idx + 2];
          const sR = simulated.data[idx];
          const sG = simulated.data[idx + 1];
          const sB = simulated.data[idx + 2];

          const dE = calculateDeltaE(oR, oG, oB, sR, sG, sB);
          totalDeltaE += dE;

          const oLum = relativeLuminance(oR, oG, oB);
          const sLum = relativeLuminance(sR, sG, sB);
          const oContrast = wcagContrast(oLum, 0);
          const sContrast = wcagContrast(sLum, 0);
          totalContrastDiff += Math.abs(oContrast - sContrast);

          blockDeltaE += dE;
          blockPixels++;

          const normalizedDiff = Math.min(1, dE / 50);
          if (normalizedDiff > threshold) {
            heatmapData[idx] = 255;
            heatmapData[idx + 1] = 0;
            heatmapData[idx + 2] = 0;
            heatmapData[idx + 3] = Math.round(normalizedDiff * 51);
          } else {
            heatmapData[idx] = 0;
            heatmapData[idx + 1] = 0;
            heatmapData[idx + 2] = 0;
            heatmapData[idx + 3] = 0;
          }
        }
      }

      if (blockPixels > 0) {
        blockDeltaE /= blockPixels;
      }

      if (blockDeltaE / 50 > threshold) {
        diffRegions.push({
          x,
          y,
          width: Math.min(blockSize, width - x),
          height: Math.min(blockSize, height - y),
        });
      }
    }
  }

  const avgDeltaE = totalPixels > 0 ? totalDeltaE / totalPixels : 0;
  const wcagContrastDiff = totalPixels > 0 ? totalContrastDiff / totalPixels : 0;

  return {
    avgDeltaE,
    wcagContrastDiff,
    diffRegions,
    heatmapData,
  };
}
