export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  points: StrokePoint[];
}

export interface Features {
  avgSlope: number;
  avgSpeed: number;
  totalLength: number;
  spacingCV: number;
  avgPressure: number;
}

function distance(p1: StrokePoint, p2: StrokePoint): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function calculateSlope(p1: StrokePoint, p2: StrokePoint): number {
  if (p2.x === p1.x) return 90;
  const radians = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let degrees = radians * (180 / Math.PI);
  if (degrees > 90) degrees -= 180;
  if (degrees < -90) degrees += 180;
  return degrees;
}

export function analyzeStrokes(strokes: Stroke[]): Features {
  if (strokes.length === 0) {
    return {
      avgSlope: 0,
      avgSpeed: 0,
      totalLength: 0,
      spacingCV: 0,
      avgPressure: 0
    };
  }

  let totalSlope = 0;
  let slopeCount = 0;
  let totalSpeed = 0;
  let speedCount = 0;
  let totalLength = 0;
  let totalPressure = 0;
  let pressureCount = 0;
  const strokeEndpoints: { x: number; y: number }[] = [];
  const segmentLengths: number[] = [];

  for (const stroke of strokes) {
    const { points } = stroke;
    if (points.length < 2) continue;

    const first = points[0];
    const last = points[points.length - 1];
    strokeEndpoints.push({ x: last.x, y: last.y });

    totalSlope += calculateSlope(first, last);
    slopeCount++;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = distance(p1, p2);
      const timeDiff = p2.timestamp - p1.timestamp;

      totalLength += dist;
      segmentLengths.push(dist);

      if (timeDiff > 0) {
        totalSpeed += dist / timeDiff;
        speedCount++;
      }

      totalPressure += p2.pressure;
      pressureCount++;
    }

    totalPressure += first.pressure;
    pressureCount++;
  }

  const avgSlope = slopeCount > 0 ? totalSlope / slopeCount : 0;
  const avgSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;
  const avgPressure = pressureCount > 0 ? totalPressure / pressureCount : 0.5;

  let spacingCV = 0;
  if (segmentLengths.length > 1) {
    const mean = segmentLengths.reduce((a, b) => a + b, 0) / segmentLengths.length;
    if (mean > 0) {
      const variance = segmentLengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / segmentLengths.length;
      const stdDev = Math.sqrt(variance);
      spacingCV = stdDev / mean;
    }
  }

  return {
    avgSlope,
    avgSpeed,
    totalLength,
    spacingCV,
    avgPressure
  };
}
