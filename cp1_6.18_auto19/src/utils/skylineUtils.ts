import * as THREE from 'three';
import { BuildingData, SkylinePoint, OcclusionResult } from '../types';
import { getBuildingHeight } from './buildingUtils';

export function calculateSkylinePoints(
  buildings: BuildingData[],
  _streetWidth: number,
  offset: number
): SkylinePoint[] {
  const sortedBuildings = [...buildings].sort((a, b) => a.x - b.x);

  const points: SkylinePoint[] = sortedBuildings.map((building) => ({
    x: building.x,
    height: getBuildingHeight(building) + offset,
    buildingId: building.id
  }));

  return points;
}

export function generateSmoothSkylinePoints(
  controlPoints: SkylinePoint[],
  segments: number = 50
): THREE.Vector3[] {
  if (controlPoints.length < 2) {
    return controlPoints.map((p) => new THREE.Vector3(p.x, p.height, 0));
  }

  const points = controlPoints.map(
    (p) => new THREE.Vector3(p.x, p.height, 0)
  );

  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  return curve.getPoints(segments);
}

export function analyzeOcclusion(
  sourceBuilding: BuildingData,
  allBuildings: BuildingData[],
  streetWidth: number
): OcclusionResult[] {
  const startTime = performance.now();

  const sourceHeight = getBuildingHeight(sourceBuilding);
  const sourceCenter = new THREE.Vector3(
    sourceBuilding.x,
    sourceHeight / 2,
    sourceBuilding.z
  );

  const rayDirection = new THREE.Vector3(0, 0, sourceBuilding.z > 0 ? -1 : 1);

  const rayCount = 15;
  const heightStep = sourceHeight / rayCount;

  const occlusionMap = new Map<string, { totalRays: number; occludedRays: number; points: THREE.Vector3[] }>();

  const raycaster = new THREE.Raycaster();
  raycaster.far = streetWidth * 3;

  for (let i = 0; i < rayCount; i++) {
    const rayOrigin = new THREE.Vector3(
      sourceCenter.x,
      heightStep * (i + 0.5),
      sourceCenter.z
    );

    raycaster.set(rayOrigin, rayDirection);

    const buildingMeshes = allBuildings
      .filter((b) => b.id !== sourceBuilding.id)
      .map((building) => {
        const buildingHeight = getBuildingHeight(building);
        const geometry = new THREE.BoxGeometry(
          building.width,
          buildingHeight,
          building.depth
        );
        const mesh = new THREE.Mesh(geometry);
        mesh.position.set(building.x, buildingHeight / 2, building.z);
        mesh.rotation.y = building.rotation;
        mesh.userData.buildingId = building.id;
        mesh.updateMatrixWorld();
        return mesh;
      });

    const intersects = raycaster.intersectObjects(buildingMeshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const buildingId = (hit.object as THREE.Mesh).userData.buildingId;

      if (!occlusionMap.has(buildingId)) {
        occlusionMap.set(buildingId, {
          totalRays: 0,
          occludedRays: 0,
          points: []
        });
      }

      const data = occlusionMap.get(buildingId)!;
      data.totalRays++;
      data.occludedRays++;
      data.points.push(hit.point.clone());

      geometryCleanup(buildingMeshes);
      continue;
    }

    allBuildings
      .filter((b) => b.id !== sourceBuilding.id)
      .forEach((b) => {
        if (!occlusionMap.has(b.id)) {
          occlusionMap.set(b.id, {
            totalRays: 0,
            occludedRays: 0,
            points: []
          });
        }
        occlusionMap.get(b.id)!.totalRays++;
      });

    geometryCleanup(buildingMeshes);
  }

  const results: OcclusionResult[] = [];
  occlusionMap.forEach((data, buildingId) => {
    if (data.occludedRays > 0) {
      results.push({
        buildingId,
        occlusionRate: data.occludedRays / data.totalRays,
        intersectionPoints: data.points
      });
    }
  });

  results.sort((a, b) => b.occlusionRate - a.occlusionRate);

  const endTime = performance.now();
  console.debug(`Occlusion analysis completed in ${(endTime - startTime).toFixed(2)}ms`);

  return results;
}

function geometryCleanup(meshes: THREE.Mesh[]): void {
  meshes.forEach((mesh) => {
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose());
    } else {
      mesh.material.dispose();
    }
  });
}

export function interpolateHeights(
  controlPoints: SkylinePoint[],
  buildings: BuildingData[],
  draggedPointIndex: number,
  newHeight: number
): BuildingData[] {
  const updatedPoints = [...controlPoints];
  updatedPoints[draggedPointIndex] = {
    ...updatedPoints[draggedPointIndex],
    height: newHeight
  };

  const influenceRadius = 2;
  const newBuildings = buildings.map((building) => {
    const pointIndex = updatedPoints.findIndex((p) => p.buildingId === building.id);
    if (pointIndex === -1) return building;

    const distance = Math.abs(pointIndex - draggedPointIndex);
    if (distance > influenceRadius) return building;

    const influence = 1 - distance / (influenceRadius + 1);
    const targetHeight = newHeight;
    const originalHeight = getBuildingHeight(building);

    const lerpFactor = influence * 0.7;
    const interpolatedHeight = originalHeight * (1 - lerpFactor) + targetHeight * lerpFactor;

    const newFloorCount = Math.max(
      3,
      Math.min(20, Math.round(interpolatedHeight / building.floorHeight))
    );

    return {
      ...building,
      floorCount: newFloorCount
    };
  });

  return newBuildings;
}

export function getOccludedFaces(
  building: BuildingData,
  occlusionResults: OcclusionResult[]
): { face: string; occlusionRate: number }[] {
  const result = occlusionResults.find((r) => r.buildingId === building.id);
  if (!result) return [];

  return [
    { face: 'front', occlusionRate: result.occlusionRate },
    { face: 'left', occlusionRate: result.occlusionRate * 0.5 },
    { face: 'right', occlusionRate: result.occlusionRate * 0.5 }
  ];
}

export function formatHeightLabel(height: number): string {
  return `${height.toFixed(1)}m`;
}

export function getSkylineBounds(
  controlPoints: SkylinePoint[]
): { minX: number; maxX: number; minHeight: number; maxHeight: number } {
  const xs = controlPoints.map((p) => p.x);
  const heights = controlPoints.map((p) => p.height);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minHeight: Math.min(...heights),
    maxHeight: Math.max(...heights)
  };
}
