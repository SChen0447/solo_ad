import * as THREE from 'three';
import type { BuildingData } from '../types';
import { calculateSunPosition } from '../scene/SceneManager';

export function calculateShadowArea(
  building: BuildingData,
  time: number,
  month: number,
  day: number
): number {
  const sunPos = calculateSunPosition(time, month, day);
  
  if (sunPos.y <= 0) {
    return 0;
  }
  
  const shadowLengthFactor = Math.sqrt(
    sunPos.x * sunPos.x + sunPos.z * sunPos.z
  ) / sunPos.y;
  
  const { width, depth, height } = building.dimensions;
  const baseArea = width * depth;
  
  const shadowArea = baseArea + height * shadowLengthFactor * Math.max(width, depth) * 0.5;
  
  return Math.max(baseArea, shadowArea);
}

export function getShadowProjectionPoints(
  building: BuildingData,
  sunDirection: THREE.Vector3
): THREE.Vector2[] {
  const { width, depth, height } = building.dimensions;
  const [bx, , bz] = building.position;
  
  const direction = sunDirection.clone().normalize();
  const groundProjection = new THREE.Vector2(direction.x, direction.z).normalize();
  
  const shadowLength = height / Math.abs(direction.y);
  
  const corners: THREE.Vector2[] = [
    new THREE.Vector2(bx - width / 2, bz - depth / 2),
    new THREE.Vector2(bx + width / 2, bz - depth / 2),
    new THREE.Vector2(bx + width / 2, bz + depth / 2),
    new THREE.Vector2(bx - width / 2, bz + depth / 2),
  ];
  
  const topCorners = corners.map(
    (corner) =>
      new THREE.Vector2(
        corner.x + groundProjection.x * shadowLength,
        corner.y + groundProjection.y * shadowLength
      )
  );
  
  return [...corners, ...topCorners];
}

export function isBuildingInShadow(
  targetBuilding: BuildingData,
  otherBuildings: BuildingData[],
  time: number,
  month: number,
  day: number
): boolean {
  const sunPos = calculateSunPosition(time, month, day);
  
  if (sunPos.y <= 0) {
    return true;
  }
  
  const sunDir = sunPos.clone().normalize();
  const targetPos = new THREE.Vector2(
    targetBuilding.position[0],
    targetBuilding.position[2]
  );
  
  for (const other of otherBuildings) {
    if (other.id === targetBuilding.id) continue;
    
    const otherPos = new THREE.Vector2(
      other.position[0],
      other.position[2]
    );
    
    const toOther = otherPos.clone().sub(targetPos);
    const sunDir2D = new THREE.Vector2(sunDir.x, sunDir.z).normalize();
    
    const dot = toOther.dot(sunDir2D);
    if (dot < 0) continue;
    
    const projection = sunDir2D.clone().multiplyScalar(dot);
    const perpendicular = toOther.clone().sub(projection);
    const perpDistance = perpendicular.length();
    
    const otherSize = Math.max(other.dimensions.width, other.dimensions.depth);
    const targetSize = Math.max(targetBuilding.dimensions.width, targetBuilding.dimensions.depth);
    
    if (perpDistance < (otherSize + targetSize) / 2) {
      const shadowHeight = other.dimensions.height - (dot * sunDir.y);
      if (shadowHeight > targetBuilding.dimensions.height * 0.3) {
        return true;
      }
    }
  }
  
  return false;
}
