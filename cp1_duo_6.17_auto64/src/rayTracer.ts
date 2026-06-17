import * as THREE from 'three';
import { RoomManager, WallPlane } from './roomManager';

export interface ReflectedPath {
  points: THREE.Vector3[];
  reflectionCount: number;
  totalLength: number;
  energy: number;
}

export interface RayTraceParams {
  maxReflections: number;
  reflectionRate: number;
  airAbsorption: number;
}

export class RayTracer {
  private roomManager: RoomManager;

  constructor(roomManager: RoomManager) {
    this.roomManager = roomManager;
  }

  public tracePaths(
    source: THREE.Vector3,
    receiver: THREE.Vector3,
    params: RayTraceParams
  ): ReflectedPath[] {
    const paths: ReflectedPath[] = [];

    const directPath = this.checkDirectPath(source, receiver);
    if (directPath) {
      paths.push(this.createPath([source, receiver], 0, params));
    }

    const walls = this.roomManager.getWalls();

    for (let order = 1; order <= params.maxReflections; order++) {
      const wallCombinations = this.generateWallCombinations(walls.length, order);
      
      for (const combo of wallCombinations) {
        const wallSequence = combo.map(idx => walls[idx]);
        const path = this.traceImageMethod(source, receiver, wallSequence, params);
        if (path) {
          paths.push(path);
        }
      }
    }

    return paths.filter(p => p.energy > 0.001);
  }

  private generateWallCombinations(numWalls: number, order: number): number[][] {
    const result: number[][] = [];
    const maxCombinations = Math.min(Math.pow(numWalls, order), 100);

    const generate = (current: number[], depth: number): void => {
      if (depth === order) {
        let hasConsecutive = false;
        for (let i = 1; i < current.length; i++) {
          if (current[i] === current[i - 1]) {
            hasConsecutive = true;
            break;
          }
        }
        if (!hasConsecutive) {
          result.push([...current]);
        }
        return;
      }

      for (let i = 0; i < numWalls && result.length < maxCombinations; i++) {
        if (depth === 0 || current[depth - 1] !== i) {
          current.push(i);
          generate(current, depth + 1);
          current.pop();
        }
      }
    };

    generate([], 0);
    return result;
  }

  private mirrorPoint(point: THREE.Vector3, wall: WallPlane): THREE.Vector3 {
    const toPoint = new THREE.Vector3().subVectors(point, wall.position);
    const dist = toPoint.dot(wall.normal);
    return point.clone().sub(wall.normal.clone().multiplyScalar(2 * dist));
  }

  private traceImageMethod(
    source: THREE.Vector3,
    receiver: THREE.Vector3,
    wallSequence: WallPlane[],
    params: RayTraceParams
  ): ReflectedPath | null {
    let imageSource = source.clone();
    const mirroredWalls: WallPlane[] = [];

    for (let i = wallSequence.length - 1; i >= 0; i--) {
      imageSource = this.mirrorPoint(imageSource, wallSequence[i]);
      mirroredWalls.unshift(wallSequence[i]);
    }

    const intersectionPoints: THREE.Vector3[] = [];
    let currentOrigin = imageSource.clone();

    for (const wall of mirroredWalls) {
      const intersection = this.intersectWall(currentOrigin, receiver, wall);
      if (!intersection) return null;

      intersectionPoints.push(intersection);
      currentOrigin = intersection.clone();
    }

    const finalCheck = this.checkDirectPath(intersectionPoints[intersectionPoints.length - 1], receiver);
    if (!finalCheck) return null;

    const fullPath = [source, ...intersectionPoints, receiver];

    for (let i = 1; i < fullPath.length - 1; i++) {
      const prev = fullPath[i - 1];
      const point = fullPath[i];
      const next = fullPath[i + 1];
      
      if (!this.validateReflection(prev, point, next, wallSequence[i - 1])) {
        return null;
      }
    }

    return this.createPath(fullPath, wallSequence.length, params);
  }

  private intersectWall(
    start: THREE.Vector3,
    end: THREE.Vector3,
    wall: WallPlane
  ): THREE.Vector3 | null {
    const dir = new THREE.Vector3().subVectors(end, start);
    const denom = dir.dot(wall.normal);
    
    if (Math.abs(denom) < 1e-6) return null;

    const t = wall.position.clone().sub(start).dot(wall.normal) / denom;
    
    if (t <= 0.001 || t >= 0.999) return null;

    const intersection = start.clone().add(dir.multiplyScalar(t));

    if (!this.isPointOnWall(intersection, wall)) return null;

    return intersection;
  }

  private isPointOnWall(point: THREE.Vector3, wall: WallPlane): boolean {
    const localPoint = point.clone().sub(wall.position);

    const tangent = new THREE.Vector3();
    if (Math.abs(wall.normal.y) > 0.9) {
      tangent.set(1, 0, 0);
    } else {
      tangent.crossVectors(wall.normal, new THREE.Vector3(0, 1, 0)).normalize();
    }
    const bitangent = new THREE.Vector3().crossVectors(wall.normal, tangent).normalize();

    const u = localPoint.dot(tangent);
    const v = localPoint.dot(bitangent);

    return Math.abs(u) <= wall.width / 2 && Math.abs(v) <= wall.height / 2;
  }

  private validateReflection(
    incoming: THREE.Vector3,
    point: THREE.Vector3,
    outgoing: THREE.Vector3,
    wall: WallPlane
  ): boolean {
    const incomingDir = new THREE.Vector3().subVectors(point, incoming).normalize();
    const outgoingDir = new THREE.Vector3().subVectors(outgoing, point).normalize();

    const reflected = incomingDir.clone().reflect(wall.normal);
    
    return reflected.dot(outgoingDir) > 0.95;
  }

  private checkDirectPath(source: THREE.Vector3, receiver: THREE.Vector3): boolean {
    const dir = new THREE.Vector3().subVectors(receiver, source);
    const length = dir.length();
    dir.normalize();

    const walls = this.roomManager.getWalls();

    for (const wall of walls) {
      const denom = dir.dot(wall.normal);
      if (Math.abs(denom) < 1e-6) continue;

      const t = wall.position.clone().sub(source).dot(wall.normal) / denom;
      if (t <= 0.01 || t >= length - 0.01) continue;

      const intersection = source.clone().add(dir.clone().multiplyScalar(t));
      if (this.isPointOnWall(intersection, wall)) {
        return false;
      }
    }

    return true;
  }

  private createPath(
    points: THREE.Vector3[],
    reflectionCount: number,
    params: RayTraceParams
  ): ReflectedPath {
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += points[i].distanceTo(points[i - 1]);
    }

    const reflectionFactor = Math.pow(params.reflectionRate, reflectionCount);
    const airFactor = Math.exp(-params.airAbsorption * totalLength);
    const distanceFactor = 1 / (1 + totalLength * 0.1);
    const energy = reflectionFactor * airFactor * distanceFactor;

    return {
      points: points.map(p => p.clone()),
      reflectionCount,
      totalLength,
      energy
    };
  }
}
