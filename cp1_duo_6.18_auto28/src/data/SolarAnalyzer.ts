import {
  computeSunPosition,
  sunToDirectionVector,
  type Vector3,
  type BuildingBounds,
  createBuildingBounds,
} from '@/utils/mathUtils';
import type { BuildingData, SolarAnalysisResult } from '@/store/useStore';

const SAMPLE_INTERVAL_MINUTES = 15;
const SAMPLES_PER_HOUR = 60 / SAMPLE_INTERVAL_MINUTES;
const START_HOUR = 6;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export function analyzeBuildingSolar(
  building: BuildingData,
  allBuildings: BuildingData[],
  dayOfYear: number
): SolarAnalysisResult {
  const targetBounds = createBuildingBounds(
    building.position,
    building.width,
    building.depth,
    building.height
  );

  const otherBuildings = allBuildings.filter((b) => b.id !== building.id);
  const otherBounds = otherBuildings.map((b) =>
    createBuildingBounds(b.position, b.width, b.depth, b.height)
  );

  const hourlyShadowMinutes: number[] = new Array(TOTAL_HOURS).fill(0);
  const hourlySunMinutes: number[] = new Array(TOTAL_HOURS).fill(0);

  let totalShadowMinutes = 0;
  let totalSunMinutes = 0;

  const shadowPointsByHour: Vector3[][] = new Array(TOTAL_HOURS).fill(null).map(() => []);

  for (let hourIdx = 0; hourIdx < TOTAL_HOURS; hourIdx++) {
    const hour = START_HOUR + hourIdx;

    for (let sample = 0; sample < SAMPLES_PER_HOUR; sample++) {
      const time = hour + sample * (SAMPLE_INTERVAL_MINUTES / 60);
      const sunPos = computeSunPosition(dayOfYear, time);

      if (sunPos.elevation <= 0) {
        continue;
      }

      const sunDir = sunToDirectionVector(sunPos);

      const isInShadow = checkBuildingInShadow(targetBounds, otherBounds, sunDir);

      if (isInShadow) {
        hourlyShadowMinutes[hourIdx] += SAMPLE_INTERVAL_MINUTES;
        totalShadowMinutes += SAMPLE_INTERVAL_MINUTES;

        const shadowFootprint = computeShadowFootprint(targetBounds, sunDir);
        shadowPointsByHour[hourIdx].push(...shadowFootprint);
      } else {
        hourlySunMinutes[hourIdx] += SAMPLE_INTERVAL_MINUTES;
        totalSunMinutes += SAMPLE_INTERVAL_MINUTES;
      }
    }
  }

  const longestShadowArea = findLongestContinuousShadowArea(
    shadowPointsByHour,
    building,
    dayOfYear
  );

  return {
    totalSunMinutes,
    totalShadowMinutes,
    hourlyShadowMinutes,
    hourlySunMinutes,
    longestShadowArea,
  };
}

function checkBuildingInShadow(
  targetBounds: BuildingBounds,
  obstacleBounds: BuildingBounds[],
  sunDirection: Vector3
): boolean {
  const sunDir = normalizeVector(sunDirection);

  const samplePoints = getBuildingSamplePoints(targetBounds);

  for (const point of samplePoints) {
    let isPointLit = true;

    for (const obstacle of obstacleBounds) {
      if (rayIntersectsBox(point, sunDir, obstacle)) {
        isPointLit = false;
        break;
      }
    }

    if (isPointLit) {
      return false;
    }
  }

  return true;
}

function getBuildingSamplePoints(bounds: BuildingBounds): Vector3[] {
  const points: Vector3[] = [];

  const xSteps = 3;
  const zSteps = 3;
  const ySteps = 2;

  for (let xi = 0; xi <= xSteps; xi++) {
    const x = bounds.minX + ((bounds.maxX - bounds.minX) * xi) / xSteps;
    for (let zi = 0; zi <= zSteps; zi++) {
      const z = bounds.minZ + ((bounds.maxZ - bounds.minZ) * zi) / zSteps;
      for (let yi = 0; yi <= ySteps; yi++) {
        const y = bounds.minY + ((bounds.maxY - bounds.minY) * yi) / ySteps;
        points.push({ x, y, z });
      }
    }
  }

  return points;
}

function rayIntersectsBox(
  origin: Vector3,
  direction: Vector3,
  box: BuildingBounds
): boolean {
  const invDir = {
    x: 1 / direction.x,
    y: 1 / direction.y,
    z: 1 / direction.z,
  };

  const tMinX = (box.minX - origin.x) * invDir.x;
  const tMaxX = (box.maxX - origin.x) * invDir.x;
  const tMinY = (box.minY - origin.y) * invDir.y;
  const tMaxY = (box.maxY - origin.y) * invDir.y;
  const tMinZ = (box.minZ - origin.z) * invDir.z;
  const tMaxZ = (box.maxZ - origin.z) * invDir.z;

  const tMin = Math.max(
    Math.min(tMinX, tMaxX),
    Math.min(tMinY, tMaxY),
    Math.min(tMinZ, tMaxZ)
  );
  const tMax = Math.min(
    Math.max(tMinX, tMaxX),
    Math.max(tMinY, tMaxY),
    Math.max(tMinZ, tMaxZ)
  );

  return tMax >= Math.max(0, tMin);
}

function normalizeVector(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function computeShadowFootprint(bounds: BuildingBounds, sunDir: Vector3): Vector3[] {
  const dir = normalizeVector(sunDir);
  const footprint: Vector3[] = [];

  const topCorners = [
    { x: bounds.minX, y: bounds.maxY, z: bounds.minZ },
    { x: bounds.maxX, y: bounds.maxY, z: bounds.minZ },
    { x: bounds.maxX, y: bounds.maxY, z: bounds.maxZ },
    { x: bounds.minX, y: bounds.maxY, z: bounds.maxZ },
  ];

  for (const corner of topCorners) {
    const t = -corner.y / dir.y;
    if (t > 0) {
      footprint.push({
        x: corner.x + dir.x * t,
        y: 0,
        z: corner.z + dir.z * t,
      });
    }
  }

  return footprint;
}

function findLongestContinuousShadowArea(
  shadowPointsByHour: Vector3[][],
  building: BuildingData,
  dayOfYear: number
): Vector3[] {
  let maxPoints: Vector3[] = [];
  let maxCount = 0;

  for (let i = 0; i < shadowPointsByHour.length; i++) {
    const points = shadowPointsByHour[i];
    if (points.length > maxCount) {
      maxCount = points.length;
      maxPoints = points;
    }
  }

  if (maxPoints.length < 4) {
    const bounds = createBuildingBounds(
      building.position,
      building.width,
      building.depth,
      building.height
    );
    const middaySun = computeSunPosition(dayOfYear, 12);
    const sunDir = sunToDirectionVector(middaySun);
    const footprint = computeShadowFootprint(bounds, sunDir);

    if (footprint.length >= 4) {
      return footprint.slice(0, 4);
    }

    return [
      { x: bounds.minX, y: 0, z: bounds.minZ },
      { x: bounds.maxX, y: 0, z: bounds.minZ },
      { x: bounds.maxX, y: 0, z: bounds.maxZ },
      { x: bounds.minX, y: 0, z: bounds.maxZ },
    ];
  }

  return computeConvexHull(maxPoints).slice(0, 8);
}

function computeConvexHull(points: Vector3[]): Vector3[] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);

  const cross = (o: Vector3, a: Vector3, b: Vector3) =>
    (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

  const lower: Vector3[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Vector3[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

export function analyzeAllBuildings(
  buildings: BuildingData[],
  dayOfYear: number
): Record<string, SolarAnalysisResult> {
  const results: Record<string, SolarAnalysisResult> = {};

  for (const building of buildings) {
    results[building.id] = analyzeBuildingSolar(building, buildings, dayOfYear);
  }

  return results;
}
