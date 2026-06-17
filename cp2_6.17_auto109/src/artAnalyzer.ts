import chroma from 'chroma-js';

export interface ColorWithWeight {
  color: string;
  weight: number;
}

export interface ArtworkAnalysis {
  colors: string[];
  colorsWithWeight: ColorWithWeight[];
  edgeImageData: ImageData | null;
  flowField: number[][] | null;
  composition: {
    pointDensity: number;
    lineDensity: number;
    blockDensity: number;
    dominantDirection: number;
  };
}

interface LabPoint {
  L: number;
  a: number;
  b: number;
  r: number;
  g: number;
  bb: number;
}

interface Cluster {
  center: LabPoint;
  points: LabPoint[];
}

function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  let R = r / 255;
  let G = g / 255;
  let B = b / 255;

  R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
  G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
  B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;

  let X = R * 0.4124 + G * 0.3576 + B * 0.1805;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = R * 0.0193 + G * 0.1192 + B * 0.9505;

  X /= 0.95047;
  Y /= 1.0;
  Z /= 1.08883;

  X = X > 0.008856 ? Math.pow(X, 1 / 3) : 7.787 * X + 16 / 116;
  Y = Y > 0.008856 ? Math.pow(Y, 1 / 3) : 7.787 * Y + 16 / 116;
  Z = Z > 0.008856 ? Math.pow(Z, 1 / 3) : 7.787 * Z + 16 / 116;

  return {
    L: 116 * Y - 16,
    a: 500 * (X - Y),
    b: 200 * (Y - Z),
  };
}

function labDistance(c1: LabPoint, c2: LabPoint): number {
  return Math.sqrt(
    Math.pow(c1.L - c2.L, 2) +
    Math.pow(c1.a - c2.a, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

function getPixelData(image: HTMLImageElement, maxSize: number = 150): ImageData {
  const canvas = document.createElement('canvas');
  const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
  canvas.width = Math.max(1, Math.floor(image.width * scale));
  canvas.height = Math.max(1, Math.floor(image.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function kMeansExtractColors(
  pixels: Uint8ClampedArray,
  k: number = 8,
  maxIterations: number = 30
): { colors: string[]; colorsWithWeight: ColorWithWeight[] } {
  const samples: LabPoint[] = [];
  const totalPixels = pixels.length / 4;
  const sampleRate = Math.max(1, Math.floor(totalPixels / 10000));

  for (let i = 0; i < totalPixels; i += sampleRate) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    if (a < 128) continue;
    const brightness = (r + g + b) / 3;
    if (brightness < 10) continue;
    const lab = rgbToLab(r, g, b);
    samples.push({ L: lab.L, a: lab.a, b: lab.b, r, g, bb: b });
  }

  if (samples.length < k) {
    const fallback: ColorWithWeight[] = [
      { color: '#e94560', weight: 0.25 },
      { color: '#0f3460', weight: 0.25 },
      { color: '#f9d923', weight: 0.25 },
      { color: '#eee', weight: 0.25 },
    ];
    return {
      colors: fallback.map(c => c.color),
      colorsWithWeight: fallback,
    };
  }

  const centroids: LabPoint[] = [];
  const shuffled = [...samples].sort(() => Math.random() - 0.5);
  centroids.push({ ...shuffled[0] });

  for (let i = 1; i < k; i++) {
    let maxDist = -1;
    let bestPoint = shuffled[0];
    for (const point of shuffled) {
      let minDistToCentroid = Infinity;
      for (const centroid of centroids) {
        const d = labDistance(point, centroid);
        if (d < minDistToCentroid) minDistToCentroid = d;
      }
      if (minDistToCentroid > maxDist) {
        maxDist = minDistToCentroid;
        bestPoint = point;
      }
    }
    centroids.push({ ...bestPoint });
  }

  const clusters: Cluster[] = centroids.map(c => ({ center: { ...c }, points: [] }));

  for (let iter = 0; iter < maxIterations; iter++) {
    for (const cluster of clusters) cluster.points = [];

    for (const point of samples) {
      let minDist = Infinity;
      let closest = 0;
      for (let i = 0; i < clusters.length; i++) {
        const d = labDistance(point, clusters[i].center);
        if (d < minDist) {
          minDist = d;
          closest = i;
        }
      }
      clusters[closest].points.push(point);
    }

    let moved = false;
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].points.length === 0) {
        const fallback = samples[Math.floor(Math.random() * samples.length)];
        clusters[i].center = { ...fallback };
        moved = true;
        continue;
      }
      const sum = clusters[i].points.reduce(
        (acc, p) => ({
          L: acc.L + p.L,
          a: acc.a + p.a,
          b: acc.b + p.b,
          r: acc.r + p.r,
          g: acc.g + p.g,
          bb: acc.bb + p.bb,
        }),
        { L: 0, a: 0, b: 0, r: 0, g: 0, bb: 0 }
      );
      const n = clusters[i].points.length;
      const newCenter: LabPoint = {
        L: sum.L / n,
        a: sum.a / n,
        b: sum.b / n,
        r: Math.round(sum.r / n),
        g: Math.round(sum.g / n),
        bb: Math.round(sum.bb / n),
      };
      if (labDistance(newCenter, clusters[i].center) > 1) moved = true;
      clusters[i].center = newCenter;
    }

    if (!moved) break;
  }

  clusters.sort((a, b) => b.points.length - a.points.length);

  const totalSampled = samples.length;
  const colorsWithWeight: ColorWithWeight[] = [];
  const seen = new Set<string>();

  for (const cluster of clusters) {
    if (cluster.points.length === 0) continue;
    const { r, g, bb } = cluster.center;
    const hex = chroma(r, g, bb).hex();
    if (seen.has(hex)) continue;
    const isDuplicate = Array.from(seen).some(existing =>
      chroma.distance(hex, existing) < 18
    );
    if (isDuplicate) continue;
    seen.add(hex);
    colorsWithWeight.push({
      color: hex,
      weight: cluster.points.length / totalSampled,
    });
  }

  if (colorsWithWeight.length < 4) {
    while (colorsWithWeight.length < 4) {
      const randomColor = chroma.random().hex();
      if (!seen.has(randomColor)) {
        colorsWithWeight.push({ color: randomColor, weight: 0.05 });
        seen.add(randomColor);
      }
    }
  }

  const totalW = colorsWithWeight.reduce((s, c) => s + c.weight, 0);
  colorsWithWeight.forEach(c => c.weight /= totalW);

  return {
    colors: colorsWithWeight.map(c => c.color),
    colorsWithWeight,
  };
}

function sobelEdgeDetection(imageData: ImageData): {
  edgeMagnitude: number[][];
  edgeDirection: number[][];
  grayData: number[][];
} {
  const { width, height, data } = imageData;
  const gray: number[][] = [];
  const magnitude: number[][] = [];
  const direction: number[][] = [];

  for (let y = 0; y < height; y++) {
    gray[y] = [];
    magnitude[y] = [];
    direction[y] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      gray[y][x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      magnitude[y][x] = 0;
      direction[y][x] = 0;
    }
  }

  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelVal = gray[y + ky][x + kx];
          const kidx = (ky + 1) * 3 + (kx + 1);
          gx += pixelVal * sobelX[kidx];
          gy += pixelVal * sobelY[kidx];
        }
      }
      magnitude[y][x] = Math.sqrt(gx * gx + gy * gy);
      direction[y][x] = Math.atan2(gy, gx);
    }
  }

  return { edgeMagnitude: magnitude, edgeDirection: direction, grayData: gray };
}

function nonMaxSuppression(
  magnitude: number[][],
  direction: number[][]
): number[][] {
  const height = magnitude.length;
  const width = magnitude[0].length;
  const suppressed: number[][] = [];

  for (let y = 0; y < height; y++) {
    suppressed[y] = [];
    for (let x = 0; x < width; x++) {
      suppressed[y][x] = 0;
    }
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let angle = direction[y][x] * (180 / Math.PI);
      if (angle < 0) angle += 180;

      let q = 255, r = 255;
      if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
        q = magnitude[y][x + 1];
        r = magnitude[y][x - 1];
      } else if (angle >= 22.5 && angle < 67.5) {
        q = magnitude[y + 1][x - 1];
        r = magnitude[y - 1][x + 1];
      } else if (angle >= 67.5 && angle < 112.5) {
        q = magnitude[y + 1][x];
        r = magnitude[y - 1][x];
      } else if (angle >= 112.5 && angle < 157.5) {
        q = magnitude[y - 1][x - 1];
        r = magnitude[y + 1][x + 1];
      }

      if (magnitude[y][x] >= q && magnitude[y][x] >= r) {
        suppressed[y][x] = magnitude[y][x];
      }
    }
  }

  return suppressed;
}

function doubleThreshold(
  suppressed: number[][],
  lowThreshold: number,
  highThreshold: number
): number[][] {
  const height = suppressed.length;
  const width = suppressed[0].length;
  const result: number[][] = [];

  const STRONG = 255;
  const WEAK = 75;

  for (let y = 0; y < height; y++) {
    result[y] = [];
    for (let x = 0; x < width; x++) {
      const val = suppressed[y][x];
      if (val >= highThreshold) result[y][x] = STRONG;
      else if (val >= lowThreshold) result[y][x] = WEAK;
      else result[y][x] = 0;
    }
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (result[y][x] === WEAK) {
        if (
          result[y - 1][x - 1] === STRONG ||
          result[y - 1][x] === STRONG ||
          result[y - 1][x + 1] === STRONG ||
          result[y][x - 1] === STRONG ||
          result[y][x + 1] === STRONG ||
          result[y + 1][x - 1] === STRONG ||
          result[y + 1][x] === STRONG ||
          result[y + 1][x + 1] === STRONG
        ) {
          result[y][x] = STRONG;
        } else {
          result[y][x] = 0;
        }
      }
    }
  }

  return result;
}

function buildFlowField(
  edgeMagnitude: number[][],
  edgeDirection: number[][]
): number[][] {
  const height = edgeMagnitude.length;
  const width = edgeMagnitude[0].length;
  const flow: number[][] = [];
  const maxMag = Math.max(...edgeMagnitude.flat());

  for (let y = 0; y < height; y++) {
    flow[y] = [];
    for (let x = 0; x < width; x++) {
      flow[y][x] = edgeDirection[y][x];
    }
  }

  const windowSize = 3;
  for (let y = windowSize; y < height - windowSize; y++) {
    for (let x = windowSize; x < width - windowSize; x++) {
      let weightedSumCos = 0;
      let weightedSumSin = 0;
      let totalWeight = 0;
      for (let dy = -windowSize; dy <= windowSize; dy++) {
        for (let dx = -windowSize; dx <= windowSize; dx++) {
          const weight = edgeMagnitude[y + dy][x + dx] / (maxMag + 1);
          const dir = edgeDirection[y + dy][x + dx];
          weightedSumCos += Math.cos(dir) * weight;
          weightedSumSin += Math.sin(dir) * weight;
          totalWeight += weight;
        }
      }
      if (totalWeight > 0.01) {
        flow[y][x] = Math.atan2(weightedSumSin / totalWeight, weightedSumCos / totalWeight);
      }
    }
  }

  return flow;
}

function analyzeCompositionCanny(
  edgeData: number[][],
  edgeMagnitude: number[][],
  edgeDirection: number[][],
  grayData: number[][]
): ArtworkAnalysis['composition'] {
  const height = edgeData.length;
  const width = edgeData[0].length;
  const totalPixels = width * height;

  let edgePixels = 0;
  const directions: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edgeData[y][x] > 0) {
        edgePixels++;
        directions.push(edgeDirection[y][x]);
      }
    }
  }

  const lineDensity = Math.min(1, edgePixels / totalPixels * 15);

  const blockSizes: number[] = [];
  const pointCount: { count: number } = { count: 0 };
  const visited: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    visited[y] = [];
    for (let x = 0; x < width; x++) visited[y][x] = false;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (edgeData[y][x] > 0 && !visited[y][x]) {
        const stack: [number, number][] = [[y, x]];
        let size = 0;
        let minX = x, maxX = x, minY = y, maxY = y;

        while (stack.length > 0) {
          const [cy, cx] = stack.pop()!;
          if (cy < 0 || cy >= height || cx < 0 || cx >= width) continue;
          if (visited[cy][cx] || edgeData[cy][cx] === 0) continue;
          visited[cy][cx] = true;
          size++;
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);
          stack.push([cy - 1, cx], [cy + 1, cx], [cy, cx - 1], [cy, cx + 1]);
        }

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const aspect = Math.min(w, h) / Math.max(w, h);
        const area = w * h;

        if (area <= 6 && aspect > 0.7) {
          pointCount.count++;
        } else if (size > 0) {
          blockSizes.push(size);
        }
      }
    }
  }

  const pointDensity = Math.min(1, pointCount.count / (totalPixels / 100));

  const avgBlockSize = blockSizes.length > 0
    ? blockSizes.reduce((a, b) => a + b, 0) / blockSizes.length
    : 0;
  const blockDensity = Math.min(1, (avgBlockSize / 50) * (blockSizes.length / (totalPixels / 500)));

  let dominantDirection = 0;
  if (directions.length > 0) {
    const bins: number[] = new Array(18).fill(0);
    for (const dir of directions) {
      let normalized = (dir * (180 / Math.PI) + 180) % 180;
      const bin = Math.min(17, Math.floor(normalized / 10));
      bins[bin]++;
    }
    const maxBin = bins.indexOf(Math.max(...bins));
    dominantDirection = maxBin * 10;
  }

  return {
    pointDensity: Math.max(0.05, pointDensity),
    lineDensity: Math.max(0.05, lineDensity),
    blockDensity: Math.max(0.05, blockDensity),
    dominantDirection,
  };
}

function createEdgeImageData(
  edgeData: number[][],
  originalImageData: ImageData
): ImageData {
  const height = edgeData.length;
  const width = edgeData[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return originalImageData;
  const imgData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const edge = edgeData[y][x];
      imgData.data[idx] = edge;
      imgData.data[idx + 1] = edge;
      imgData.data[idx + 2] = edge;
      imgData.data[idx + 3] = 255;
    }
  }
  return imgData;
}

export async function analyseArtwork(image: HTMLImageElement): Promise<ArtworkAnalysis> {
  return new Promise((resolve, reject) => {
    try {
      const imageData = getPixelData(image, 150);
      const { colors, colorsWithWeight } = kMeansExtractColors(imageData.data, 8);
      const { edgeMagnitude, edgeDirection, grayData } = sobelEdgeDetection(imageData);
      const suppressed = nonMaxSuppression(edgeMagnitude, edgeDirection);
      
      const allMagnitudes = suppressed.flat().sort((a, b) => a - b);
      const highThreshold = allMagnitudes[Math.floor(allMagnitudes.length * 0.9)] || 50;
      const lowThreshold = highThreshold * 0.4;
      
      const edgeData = doubleThreshold(suppressed, lowThreshold, highThreshold);
      const composition = analyzeCompositionCanny(edgeData, edgeMagnitude, edgeDirection, grayData);
      const flowField = buildFlowField(edgeMagnitude, edgeDirection);
      const edgeImageData = createEdgeImageData(edgeData, imageData);
      
      resolve({ colors, colorsWithWeight, composition, flowField, edgeImageData });
    } catch (error) {
      reject(error);
    }
  });
}
