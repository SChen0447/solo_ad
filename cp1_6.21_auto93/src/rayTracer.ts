import * as THREE from 'three';
import { Room, RoomData, WallName, WallReflectivity } from './room';

export interface ReflectionPoint {
  position: THREE.Vector3;
  reflectionIndex: number;
  energy: number;
  hitWall: WallName | null;
}

export interface RayPath {
  id: string;
  points: ReflectionPoint[];
  totalReflections: number;
}

export interface RayTracerParams {
  sourcePosition: THREE.Vector3;
  rayCount: number;
  maxReflections: number;
  minEnergyThreshold: number;
  reflectivity: WallReflectivity;
  room: RoomData;
  seed?: number;
}

const MAX_REFLECTIONS = 6;
const MIN_ENERGY = 0.02;

export class RayTracer {
  private static readonly EPSILON = 1e-4;

  public static trace(params: Partial<RayTracerParams> & { room: RoomData; sourcePosition: THREE.Vector3 }): RayPath[] {
    const rayCount = Math.max(1, Math.min(64, Math.floor(params.rayCount ?? 16)));
    const maxReflections = Math.min(MAX_REFLECTIONS, params.maxReflections ?? MAX_REFLECTIONS);
    const minEnergy = params.minEnergyThreshold ?? MIN_ENERGY;
    const reflectivity = params.reflectivity ?? params.room.reflectivity;
    const seed = params.seed ?? Date.now();

    const roomBounds = params.room.getBounds();
    const source = this.clampPosition(params.sourcePosition, roomBounds);

    const results: RayPath[] = [];
    const planes = this.buildPlanes(params.room);

    for (let i = 0; i < rayCount; i++) {
      const direction = this.generateRandomDirection(i, seed, rayCount);
      const path = this.traceSingleRay(source, direction, planes, reflectivity, maxReflections, minEnergy);
      results.push({
        id: `ray_${seed}_${i}`,
        points: path,
        totalReflections: Math.max(0, path.length - 2),
      });
    }

    return results;
  }

  public static getColorForReflection(reflectionIndex: number, energy: number): THREE.Color {
    const colors: THREE.Color[] = [
      new THREE.Color(0x4a9eff),
      new THREE.Color(0x7a7aff),
      new THREE.Color(0xaa55ff),
      new THREE.Color(0xd040aa),
      new THREE.Color(0xe83060),
      new THREE.Color(0xff2222),
      new THREE.Color(0xff4444),
    ];

    const clampedIdx = Math.max(0, Math.min(colors.length - 1, reflectionIndex));
    const nextIdx = Math.min(colors.length - 1, clampedIdx + 1);

    const t = reflectionIndex - clampedIdx;
    const baseColor = new THREE.Color().lerpColors(colors[clampedIdx], colors[nextIdx], t);

    const brightness = 0.4 + Math.min(1, energy) * 0.6;
    return baseColor.multiplyScalar(brightness);
  }

  public static getOpacityForEnergy(energy: number, reflectionIndex: number): number {
    const base = 0.85;
    const energyFactor = Math.max(0.1, Math.min(1, energy));
    const reflectionFactor = Math.max(0.3, 1 - reflectionIndex * 0.08);
    return base * energyFactor * reflectionFactor;
  }

  private static clampPosition(pos: THREE.Vector3, bounds: { min: THREE.Vector3; max: THREE.Vector3 }): THREE.Vector3 {
    const margin = this.EPSILON * 10;
    return new THREE.Vector3(
      Math.min(bounds.max.x - margin, Math.max(bounds.min.x + margin, pos.x)),
      Math.min(bounds.max.y - margin, Math.max(bounds.min.y + margin, pos.y)),
      Math.min(bounds.max.z - margin, Math.max(bounds.min.z + margin, pos.z))
    );
  }

  private static buildPlanes(room: RoomData): { name: WallName; plane: THREE.Plane; bounds: { min: THREE.Vector3; max: THREE.Vector3 } }[] {
    const { width, depth, height } = room.config;
    const halfW = width / 2;
    const halfD = depth / 2;

    return [
      {
        name: 'left',
        plane: new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfW),
        bounds: {
          min: new THREE.Vector3(-halfW, 0, -halfD),
          max: new THREE.Vector3(-halfW, height, halfD),
        },
      },
      {
        name: 'right',
        plane: new THREE.Plane(new THREE.Vector3(1, 0, 0), halfW),
        bounds: {
          min: new THREE.Vector3(halfW, 0, -halfD),
          max: new THREE.Vector3(halfW, height, halfD),
        },
      },
      {
        name: 'back',
        plane: new THREE.Plane(new THREE.Vector3(0, 0, -1), halfD),
        bounds: {
          min: new THREE.Vector3(-halfW, 0, -halfD),
          max: new THREE.Vector3(halfW, height, -halfD),
        },
      },
      {
        name: 'front',
        plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), halfD),
        bounds: {
          min: new THREE.Vector3(-halfW, 0, halfD),
          max: new THREE.Vector3(halfW, height, halfD),
        },
      },
      {
        name: 'floor',
        plane: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
        bounds: {
          min: new THREE.Vector3(-halfW, 0, -halfD),
          max: new THREE.Vector3(halfW, 0, halfD),
        },
      },
      {
        name: 'ceiling',
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -height),
        bounds: {
          min: new THREE.Vector3(-halfW, height, -halfD),
          max: new THREE.Vector3(halfW, height, halfD),
        },
      },
    ];
  }

  private static generateRandomDirection(index: number, seed: number, total: number): THREE.Vector3 {
    const s1 = this.hash2D(seed, index);
    const s2 = this.hash2D(seed + 1000, index + total);

    const theta = 2 * Math.PI * s1;
    const phi = Math.acos(2 * s2 - 1);

    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.abs(Math.sin(phi) * Math.sin(theta)) * 0.5 + 0.1,
      Math.cos(phi)
    ).normalize();
  }

  private static hash2D(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h >>> 0) % 100000) / 100000;
  }

  private static traceSingleRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    planes: { name: WallName; plane: THREE.Plane; bounds: { min: THREE.Vector3; max: THREE.Vector3 } }[],
    reflectivity: WallReflectivity,
    maxReflections: number,
    minEnergy: number
  ): ReflectionPoint[] {
    const points: ReflectionPoint[] = [];
    let currentOrigin = origin.clone();
    let currentDir = direction.clone().normalize();
    let energy = 1.0;

    points.push({
      position: currentOrigin.clone(),
      reflectionIndex: 0,
      energy,
      hitWall: null,
    });

    for (let reflection = 0; reflection <= maxReflections; reflection++) {
      if (energy < minEnergy) break;

      const hit = this.findNearestIntersection(currentOrigin, currentDir, planes);

      if (!hit) break;

      energy *= reflectivity[hit.wall];

      if (reflection < maxReflections && energy >= minEnergy) {
        const reflectedDir = this.reflect(currentDir, hit.plane.normal).normalize();
        points.push({
          position: hit.point.clone(),
          reflectionIndex: reflection + 1,
          energy,
          hitWall: hit.wall,
        });
        currentOrigin = hit.point.clone().add(reflectedDir.clone().multiplyScalar(this.EPSILON * 2));
        currentDir = reflectedDir;
      } else {
        points.push({
          position: hit.point.clone(),
          reflectionIndex: reflection + 1,
          energy: energy * 0.5,
          hitWall: hit.wall,
        });
        break;
      }
    }

    return points;
  }

  private static findNearestIntersection(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    planes: { name: WallName; plane: THREE.Plane; bounds: { min: THREE.Vector3; max: THREE.Vector3 } }[]
  ): { point: THREE.Vector3; distance: number; wall: WallName; plane: THREE.Plane } | null {
    let nearest: { point: THREE.Vector3; distance: number; wall: WallName; plane: THREE.Plane } | null = null;
    const maxDistance = 100;

    for (const { name, plane, bounds } of planes) {
      const t = this.intersectRayPlane(origin, direction, plane);
      if (t === null || t <= this.EPSILON || t > maxDistance) continue;

      const point = origin.clone().add(direction.clone().multiplyScalar(t));

      if (this.isPointInBounds(point, bounds)) {
        if (!nearest || t < nearest.distance) {
          nearest = { point, distance: t, wall: name, plane };
        }
      }
    }

    return nearest;
  }

  private static intersectRayPlane(origin: THREE.Vector3, direction: THREE.Vector3, plane: THREE.Plane): number | null {
    const denom = plane.normal.dot(direction);
    if (Math.abs(denom) < this.EPSILON * 0.1) return null;

    const t = -(plane.constant + plane.normal.dot(origin)) / denom;
    return t > this.EPSILON ? t : null;
  }

  private static isPointInBounds(point: THREE.Vector3, bounds: { min: THREE.Vector3; max: THREE.Vector3 }): boolean {
    const tolerance = this.EPSILON * 5;
    return (
      point.x >= bounds.min.x - tolerance && point.x <= bounds.max.x + tolerance &&
      point.y >= bounds.min.y - tolerance && point.y <= bounds.max.y + tolerance &&
      point.z >= bounds.min.z - tolerance && point.z <= bounds.max.z + tolerance
    );
  }

  private static reflect(direction: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
    const dot = direction.dot(normal);
    return direction.clone().sub(normal.clone().multiplyScalar(2 * dot));
  }
}
