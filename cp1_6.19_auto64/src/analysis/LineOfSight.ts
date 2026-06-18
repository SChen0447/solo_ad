import * as THREE from 'three';
import type { SceneElement, LineOfSightResult, ElementType } from '../types';

interface ElementBounds {
  id: string;
  type: ElementType;
  position: { x: number; y: number; z: number };
  min: THREE.Vector3;
  max: THREE.Vector3;
}

const getElementBounds = (element: SceneElement): ElementBounds => {
  const { position, height, type } = element;
  const halfSize = 0.25;

  let minY = position.y;
  let maxY = position.y + height;

  if (type === 'tree') {
    minY = position.y;
    maxY = position.y + height;
  }

  return {
    id: element.id,
    type: element.type,
    position: element.position,
    min: new THREE.Vector3(
      position.x - halfSize,
      minY,
      position.z - halfSize
    ),
    max: new THREE.Vector3(
      position.x + halfSize,
      maxY,
      position.z + halfSize
    ),
  };
};

const rayIntersectsBox = (
  rayOrigin: THREE.Vector3,
  rayDirection: THREE.Vector3,
  boxMin: THREE.Vector3,
  boxMax: THREE.Vector3
): { hit: boolean; distance: number; point: THREE.Vector3 | null } => {
  let tmin = -Infinity;
  let tmax = Infinity;

  for (let i = 0; i < 3; i++) {
    const origin = rayOrigin.getComponent(i);
    const direction = rayDirection.getComponent(i);
    const minVal = boxMin.getComponent(i);
    const maxVal = boxMax.getComponent(i);

    if (Math.abs(direction) < 0.0000001) {
      if (origin < minVal || origin > maxVal) {
        return { hit: false, distance: Infinity, point: null };
      }
    } else {
      let t1 = (minVal - origin) / direction;
      let t2 = (maxVal - origin) / direction;

      if (t1 > t2) {
        [t1, t2] = [t2, t1];
      }

      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);

      if (tmin > tmax) {
        return { hit: false, distance: Infinity, point: null };
      }
    }
  }

  if (tmin < 0) {
    tmin = tmax;
    if (tmin < 0) {
      return { hit: false, distance: Infinity, point: null };
    }
  }

  const hitPoint = rayOrigin
    .clone()
    .add(rayDirection.clone().multiplyScalar(tmin));

  return { hit: true, distance: tmin, point: hitPoint };
};

export const checkLineOfSight = (
  startPoint: { x: number; y: number; z: number },
  endPoint: { x: number; y: number; z: number },
  elements: SceneElement[],
  ignoreElementId?: string
): LineOfSightResult => {
  const start = new THREE.Vector3(
    startPoint.x,
    startPoint.y,
    startPoint.z
  );
  const end = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z);

  const direction = end.clone().sub(start).normalize();
  const totalDistance = end.distanceTo(start);

  const elementBounds = elements
    .filter((el) => el.id !== ignoreElementId)
    .map(getElementBounds);

  const occluders: Array<{
    id: string;
    type: ElementType;
    position: { x: number; y: number; z: number };
    hitPoint: { x: number; y: number; z: number };
    distance: number;
  }> = [];

  for (const bounds of elementBounds) {
    const result = rayIntersectsBox(start, direction, bounds.min, bounds.max);

    if (result.hit && result.distance <= totalDistance && result.distance > 0.001) {
      if (result.point) {
        occluders.push({
          id: bounds.id,
          type: bounds.type,
          position: bounds.position,
          hitPoint: {
            x: result.point.x,
            y: result.point.y,
            z: result.point.z,
          },
          distance: result.distance,
        });
      }
    }
  }

  occluders.sort((a, b) => a.distance - b.distance);

  return {
    visible: occluders.length === 0,
    occluders: occluders.map((o) => ({
      id: o.id,
      type: o.type,
      position: o.position,
    })),
    startPoint,
    endPoint,
  };
};

export const getOccluderPoints = (
  startPoint: { x: number; y: number; z: number },
  endPoint: { x: number; y: number; z: number },
  elements: SceneElement[],
  ignoreElementId?: string
): Array<{ x: number; y: number; z: number }> => {
  const start = new THREE.Vector3(
    startPoint.x,
    startPoint.y,
    startPoint.z
  );
  const end = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z);

  const direction = end.clone().sub(start).normalize();
  const totalDistance = end.distanceTo(start);

  const elementBounds = elements
    .filter((el) => el.id !== ignoreElementId)
    .map(getElementBounds);

  const hitPoints: Array<{ x: number; y: number; z: number }> = [];

  for (const bounds of elementBounds) {
    const result = rayIntersectsBox(start, direction, bounds.min, bounds.max);

    if (result.hit && result.distance <= totalDistance && result.distance > 0.001) {
      if (result.point) {
        hitPoints.push({
          x: result.point.x,
          y: result.point.y,
          z: result.point.z,
        });
      }
    }
  }

  return hitPoints;
};

export const snapToGrid = (
  point: { x: number; y: number; z: number },
  gridSize: number = 0.5
): { x: number; y: number; z: number } => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: point.y,
    z: Math.round(point.z / gridSize) * gridSize,
  };
};

export const isPositionInBounds = (
  position: { x: number; z: number },
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } = {
    minX: -5,
    maxX: 5,
    minZ: -5,
    maxZ: 5,
  }
): boolean => {
  const margin = 0.25;
  return (
    position.x >= bounds.minX + margin &&
    position.x <= bounds.maxX - margin &&
    position.z >= bounds.minZ + margin &&
    position.z <= bounds.maxZ - margin
  );
};

export const checkOverlap = (
  position: { x: number; z: number },
  elements: SceneElement[],
  ignoreId?: string,
  gridSize: number = 0.5
): boolean => {
  const halfSize = gridSize / 2;
  const margin = 0.01;

  for (const element of elements) {
    if (ignoreId && element.id === ignoreId) continue;

    const dx = Math.abs(position.x - element.position.x);
    const dz = Math.abs(position.z - element.position.z);

    if (dx < halfSize * 2 - margin && dz < halfSize * 2 - margin) {
      return true;
    }
  }

  return false;
};
