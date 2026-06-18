import { TrajectoryPoint, RuneType } from '../store/types';

export interface InflectionPoint {
  index: number;
  angle: number;
  direction: 'left' | 'right';
}

const dist = (a: TrajectoryPoint, b: TrajectoryPoint): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

const angleDeg = (p1: TrajectoryPoint, p2: TrajectoryPoint, p3: TrajectoryPoint): number => {
  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;
  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
};

export const detectInflectionPoints = (points: TrajectoryPoint[]): InflectionPoint[] => {
  if (points.length < 5) return [];

  const step = Math.max(1, Math.floor(points.length / 40));
  const simplified: TrajectoryPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i]);
  }
  if (simplified[simplified.length - 1] !== points[points.length - 1]) {
    simplified.push(points[points.length - 1]);
  }
  if (simplified.length < 5) simplified.push(...points.slice(-(5 - simplified.length)));

  const inflections: InflectionPoint[] = [];
  const angleThreshold = 25;

  for (let i = 1; i < simplified.length - 1; i++) {
    const angle = angleDeg(simplified[i - 1], simplified[i], simplified[i + 1]);
    if (Math.abs(angle) > angleThreshold) {
      inflections.push({
        index: i,
        angle: Math.abs(angle),
        direction: angle > 0 ? 'left' : 'right',
      });
    }
  }

  const merged: InflectionPoint[] = [];
  const mergeGap = 2;
  for (const inf of inflections) {
    if (merged.length === 0 || inf.index - merged[merged.length - 1].index > mergeGap) {
      merged.push(inf);
    } else {
      const last = merged[merged.length - 1];
      if (inf.angle > last.angle) {
        merged[merged.length - 1] = inf;
      }
    }
  }

  return merged;
};

const computeBoundingBox = (points: TrajectoryPoint[]) => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
};

const isClosed = (points: TrajectoryPoint[]): boolean => {
  if (points.length < 10) return false;
  const { w, h } = computeBoundingBox(points);
  const diag = Math.hypot(w, h);
  if (diag === 0) return false;
  const startEnd = dist(points[0], points[points.length - 1]);
  return startEnd / diag < 0.3;
};

const estimateWinding = (points: TrajectoryPoint[]): number => {
  let sum = 0;
  const step = Math.max(1, Math.floor(points.length / 50));
  for (let i = 0; i + step < points.length; i += step) {
    const a = points[i];
    const b = points[Math.min(i + step, points.length - 1)];
    sum += (b.x - a.x) * (b.y + a.y);
  }
  return sum;
};

const countOscillationsY = (points: TrajectoryPoint[]): number => {
  if (points.length < 4) return 0;
  const step = Math.max(1, Math.floor(points.length / 30));
  const smoothed: number[] = [];
  for (let i = 0; i < points.length; i += step) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(points.length - 1, i + 2); j++) {
      s += points[j].y;
      c++;
    }
    smoothed.push(s / c);
  }

  let osc = 0;
  let lastDir = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const d = smoothed[i] - smoothed[i - 1];
    if (Math.abs(d) < 1) continue;
    const dir = d > 0 ? 1 : -1;
    if (lastDir !== 0 && dir !== lastDir) osc++;
    lastDir = dir;
  }
  return osc;
};

const countAcuteReversals = (inflections: InflectionPoint[]): number => {
  let sharp = 0;
  let altCount = 0;
  for (let i = 0; i < inflections.length; i++) {
    if (inflections[i].angle >= 60) sharp++;
    if (i > 0 && inflections[i].direction !== inflections[i - 1].direction) {
      altCount++;
    }
  }
  return inflections.length >= 3 && altCount >= 2 ? Math.max(sharp, altCount + 1) : 0;
};

export const recognizeRune = (points: TrajectoryPoint[]): RuneType | null => {
  if (points.length < 5) return null;

  const inflections = detectInflectionPoints(points);
  if (inflections.length < 3) return null;

  const { w, h } = computeBoundingBox(points);
  if (w + h < 50) return null;

  const closed = isClosed(points);
  const winding = estimateWinding(points);
  const oscY = countOscillationsY(points);
  const acuteCount = countAcuteReversals(inflections);
  const aspect = w > 0 ? h / w : 1;

  const scores: Record<RuneType, number> = {
    growth: 0,
    bloom: 0,
    mutation: 0,
  };

  if (closed && Math.abs(winding) > 500) scores.growth += 3;
  if (closed) scores.growth += 2;
  if (inflections.length >= 4 && aspect > 0.6 && aspect < 1.6) scores.growth += 1;
  const uniformAngles = inflections.filter(i => i.angle >= 30 && i.angle <= 100).length;
  if (uniformAngles >= 3) scores.growth += 1;

  if (oscY >= 3) scores.bloom += 3;
  if (oscY >= 2) scores.bloom += 2;
  if (aspect < 1.2) scores.bloom += 1;
  if (!closed) scores.bloom += 1;
  const smooth = inflections.filter(i => i.angle >= 20 && i.angle <= 70).length;
  if (smooth >= 3) scores.bloom += 1;

  if (acuteCount >= 3) scores.mutation += 3;
  if (inflections.length >= 4 && acuteCount >= 2) scores.mutation += 2;
  const sharpAngles = inflections.filter(i => i.angle >= 55).length;
  if (sharpAngles >= 3) scores.mutation += 2;
  let reversals = 0;
  for (let i = 1; i < inflections.length; i++) {
    if (inflections[i].direction !== inflections[i - 1].direction) reversals++;
  }
  if (reversals >= 2) scores.mutation += 1;

  let best: RuneType = 'growth';
  let bestScore = -Infinity;
  (['growth', 'bloom', 'mutation'] as RuneType[]).forEach(k => {
    if (scores[k] > bestScore) {
      bestScore = scores[k];
      best = k;
    }
  });

  if (bestScore < 2) return null;

  const secondBest = Math.max(
    ...(['growth', 'bloom', 'mutation'] as RuneType[])
      .filter(k => k !== best)
      .map(k => scores[k])
  );
  if (bestScore - secondBest < 1 && scores.growth === scores.bloom && scores.bloom === scores.mutation) {
    return null;
  }

  return best;
};
