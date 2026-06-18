import { RoomConfig, Wall, Point, SoundSource, getWallNormal } from './roomModel';

export interface ReflectionSegment {
  start: Point;
  end: Point;
  reflectionOrder: number;
  wallLabel: string;
  splAtEnd: number;
}

export interface ReflectionPath {
  sourceId: string;
  segments: ReflectionSegment[];
  color: string;
}

const SPEED_OF_SOUND = 343;
const ABSORPTION_COEFF = 0.15;
const MAX_REFLECTIONS = 6;
const NUM_RAYS = 360;

function rayWallIntersection(
  rayOrigin: Point,
  rayDir: Point,
  wall: Wall
): { t: number; u: number; point: Point } | null {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;

  const denom = rayDir.x * dy - rayDir.y * dx;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((wall.start.x - rayOrigin.x) * dy - (wall.start.y - rayOrigin.y) * dx) / denom;
  const u = ((wall.start.x - rayOrigin.x) * rayDir.y - (wall.start.y - rayOrigin.y) * rayDir.x) / denom;

  if (t > 0.001 && u >= 0 && u <= 1) {
    return {
      t,
      u,
      point: {
        x: rayOrigin.x + t * rayDir.x,
        y: rayOrigin.y + t * rayDir.y,
      },
    };
  }
  return null;
}

function reflectVector(dir: Point, normal: Point): Point {
  const dot = dir.x * normal.x + dir.y * normal.y;
  return {
    x: dir.x - 2 * dot * normal.x,
    y: dir.y - 2 * dot * normal.y,
  };
}

function normalize(p: Point): Point {
  const len = Math.sqrt(p.x * p.x + p.y * p.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: p.x / len, y: p.y / len };
}

function computeSPL(initialVolume: number, distance: number, reflectionOrder: number): number {
  const distanceAttenuation = 20 * Math.log10(Math.max(1, 1 / (distance + 1)));
  const absorptionAttenuation = -10 * Math.log10(Math.pow(1 - ABSORPTION_COEFF, reflectionOrder));
  return initialVolume + distanceAttenuation - absorptionAttenuation;
}

function frequencyToColor(frequency: number): string {
  const t = Math.min(1, Math.max(0, (frequency - 100) / 4900));
  const r = Math.round(255 * (1 - t));
  const g = Math.round(100 * (1 - Math.abs(t - 0.5) * 2));
  const b = Math.round(255 * t);
  return `rgb(${r},${g},${b})`;
}

function traceRay(
  origin: Point,
  direction: Point,
  walls: Wall[],
  sourceVolume: number,
  maxReflections: number,
  sourceId: string,
  frequency: number
): ReflectionPath {
  const segments: ReflectionSegment[] = [];
  let currentOrigin = { ...origin };
  let currentDir = normalize(direction);
  let totalDistance = 0;
  const color = frequencyToColor(frequency);

  for (let order = 0; order <= maxReflections; order++) {
    let closestHit: { t: number; wall: Wall; point: Point } | null = null;

    for (const wall of walls) {
      const hit = rayWallIntersection(currentOrigin, currentDir, wall);
      if (hit && (!closestHit || hit.t < closestHit.t)) {
        closestHit = { t: hit.t, wall, point: hit.point };
      }
    }

    if (!closestHit) break;

    totalDistance += closestHit.t;
    const spl = computeSPL(sourceVolume, totalDistance, order);

    segments.push({
      start: { ...currentOrigin },
      end: { ...closestHit.point },
      reflectionOrder: order,
      wallLabel: closestHit.wall.label || '墙壁',
      splAtEnd: Math.round(spl * 10) / 10,
    });

    const normal = getWallNormal(closestHit.wall);
    const dot = currentDir.x * normal.x + currentDir.y * normal.y;
    const orientedNormal = dot < 0 ? normal : { x: -normal.x, y: -normal.y };

    currentDir = normalize(reflectVector(currentDir, orientedNormal));
    currentOrigin = {
      x: closestHit.point.x + currentDir.x * 0.01,
      y: closestHit.point.y + currentDir.y * 0.01,
    };
  }

  return { sourceId, segments, color };
}

export function simulateReflections(config: RoomConfig): ReflectionPath[] {
  const paths: ReflectionPath[] = [];

  for (const source of config.sources) {
    const rayCount = source.type === 'line' ? NUM_RAYS * 2 : NUM_RAYS;

    for (let i = 0; i < rayCount; i++) {
      const angle = (2 * Math.PI * i) / rayCount;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };

      const path = traceRay(
        source.position,
        direction,
        config.walls,
        source.volume,
        MAX_REFLECTIONS,
        source.id,
        source.frequency
      );

      paths.push(path);
    }
  }

  return paths;
}

export function simulateReflectionsForSource(
  source: SoundSource,
  walls: Wall[]
): ReflectionPath[] {
  const paths: ReflectionPath[] = [];
  const rayCount = source.type === 'line' ? NUM_RAYS * 2 : NUM_RAYS;

  for (let i = 0; i < rayCount; i++) {
    const angle = (2 * Math.PI * i) / rayCount;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };

    const path = traceRay(
      source.position,
      direction,
      walls,
      source.volume,
      MAX_REFLECTIONS,
      source.id,
      source.frequency
    );

    paths.push(path);
  }

  return paths;
}
