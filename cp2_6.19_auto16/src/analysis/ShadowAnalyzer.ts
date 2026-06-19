import * as THREE from 'three';
import { BuildingData, ShadowResult, LightParams, BUILDING_PRESETS } from '../types';

export class ShadowAnalyzer {
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private shadowOverlays: Map<string, THREE.Mesh> = new Map();
  private comparisonOverlays: Map<number, Map<string, THREE.Line>> = new Map();
  private lastResults: ShadowResult[] = [];
  private isComparisonVisible: boolean = true;
  
  private onShadowUpdate?: (results: ShadowResult[]) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 500;
  }

  public calculateShadows(
    buildings: BuildingData[],
    buildingMeshes: THREE.Group[],
    lightParams: LightParams
  ): ShadowResult[] {
    if (buildings.length === 0) {
      this.clearAllOverlays();
      this.lastResults = [];
      return [];
    }

    const results: ShadowResult[] = [];
    const sunDir = new THREE.Vector3(
      lightParams.direction.x,
      lightParams.direction.y,
      lightParams.direction.z
    ).normalize();

    for (let i = 0; i < buildings.length; i++) {
      const building = buildings[i];
      const shadowRate = this.calculateShadowRate(building, buildings, buildingMeshes, sunDir, i);
      
      results.push({
        buildingId: building.id,
        shadowRate: Math.round(shadowRate * 10) / 10
      });

      this.updateShadowOverlay(building, buildingMeshes[i], sunDir, 0xffffff, 0.3);
    }

    this.lastResults = results;
    
    if (this.onShadowUpdate) {
      this.onShadowUpdate(results);
    }

    return results;
  }

  private calculateShadowRate(
    targetBuilding: BuildingData,
    _allBuildings: BuildingData[],
    allMeshes: THREE.Group[],
    sunDir: THREE.Vector3,
    _targetIndex: number
  ): number {
    const preset = BUILDING_PRESETS[targetBuilding.type];
    const gridSize = 10;
    const samplePoints: THREE.Vector3[] = [];
    
    const halfW = preset.width / 2 - 1;
    const halfD = preset.depth / 2 - 1;
    const stepW = (halfW * 2) / (gridSize - 1);
    const stepD = (halfD * 2) / (gridSize - 1);

    const rotationY = targetBuilding.rotation * Math.PI / 180;
    const cosR = Math.cos(rotationY);
    const sinR = Math.sin(rotationY);

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        let localX = -halfW + i * stepW;
        let localZ = -halfD + j * stepD;
        
        const rotatedX = localX * cosR - localZ * sinR;
        const rotatedZ = localX * sinR + localZ * cosR;
        
        const worldPoint = new THREE.Vector3(
          targetBuilding.position.x + rotatedX,
          targetBuilding.height + 0.5,
          targetBuilding.position.z + rotatedZ
        );
        samplePoints.push(worldPoint);
      }
    }

    const otherMeshes = allMeshes.filter((_, idx) => idx !== targetIndex);
    
    if (otherMeshes.length === 0) {
      return 0;
    }

    let shadowedCount = 0;
    const rayDir = sunDir.clone().negate();

    for (const point of samplePoints) {
      this.raycaster.set(point, rayDir);
      const intersections = this.raycaster.intersectObjects(otherMeshes, true);
      
      if (intersections.length > 0) {
        shadowedCount++;
      }
    }

    return (shadowedCount / samplePoints.length) * 100;
  }

  private updateShadowOverlay(
    building: BuildingData,
    mesh: THREE.Group,
    sunDir: THREE.Vector3,
    color: number,
    opacity: number
  ): void {
    const existing = this.shadowOverlays.get(building.id);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      (existing.material as THREE.Material).dispose();
    }

    const contourPoints = this.generateShadowContour(mesh, sunDir, building);
    if (contourPoints.length < 3) return;

    const shape = new THREE.Shape(contourPoints.map(p => new THREE.Vector2(p.x, p.z)));
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const overlay = new THREE.Mesh(geometry, material);
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = 0.02;
    overlay.renderOrder = 1;
    
    this.scene.add(overlay);
    this.shadowOverlays.set(building.id, overlay);
  }

  private generateShadowContour(
    _mesh: THREE.Group,
    sunDir: THREE.Vector3,
    building: BuildingData
  ): THREE.Vector3[] {
    const preset = BUILDING_PRESETS[building.type];
    const height = building.height;
    const halfW = preset.width / 2;
    const halfD = preset.depth / 2;
    
    let corners: THREE.Vector3[];
    
    if (building.type === 'office' || building.type === 'tower') {
      corners = [
        new THREE.Vector3(-halfW, 0, -halfD),
        new THREE.Vector3(halfW, 0, -halfD),
        new THREE.Vector3(halfW, 0, halfD),
        new THREE.Vector3(-halfW, 0, halfD),
        new THREE.Vector3(-halfW, height, -halfD),
        new THREE.Vector3(halfW, height, -halfD),
        new THREE.Vector3(halfW, height, halfD),
        new THREE.Vector3(-halfW, height, halfD)
      ];
    } else {
      corners = [
        new THREE.Vector3(-halfW, 0, -halfD),
        new THREE.Vector3(halfW, 0, -halfD),
        new THREE.Vector3(halfW, 0, -halfD * 0.2),
        new THREE.Vector3(-halfW * 0.2, 0, -halfD * 0.2),
        new THREE.Vector3(-halfW * 0.2, 0, halfD),
        new THREE.Vector3(-halfW, 0, halfD),
        new THREE.Vector3(-halfW, height, -halfD),
        new THREE.Vector3(halfW, height, -halfD),
        new THREE.Vector3(halfW, height, -halfD * 0.2),
        new THREE.Vector3(-halfW * 0.2, height, -halfD * 0.2),
        new THREE.Vector3(-halfW * 0.2, height, halfD),
        new THREE.Vector3(-halfW, height, halfD)
      ];
    }

    const rotationY = building.rotation * Math.PI / 180;
    const rotatedCorners = corners.map(c => {
      const x = c.x * Math.cos(rotationY) - c.z * Math.sin(rotationY);
      const z = c.x * Math.sin(rotationY) + c.z * Math.cos(rotationY);
      return new THREE.Vector3(
        x + building.position.x,
        c.y,
        z + building.position.z
      );
    });

    const projectedPoints: THREE.Vector3[] = [];
    const rayDir = sunDir.clone().negate();

    for (const corner of rotatedCorners) {
      if (Math.abs(rayDir.y) < 0.001) continue;
      
      const t = -corner.y / rayDir.y;
      if (t < 0) continue;
      
      const projected = new THREE.Vector3(
        corner.x + rayDir.x * t,
        0,
        corner.z + rayDir.z * t
      );
      projectedPoints.push(projected);
    }

    return this.convexHull(projectedPoints);
  }

  private convexHull(points: THREE.Vector3[]): THREE.Vector3[] {
    if (points.length < 3) return points;
    
    const sorted = points.slice().sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.z - b.z;
    });

    const cross = (o: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number => {
      return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
    };

    const lower: THREE.Vector3[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: THREE.Vector3[] = [];
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

  public calculateComparisonShadows(
    buildings: BuildingData[],
    buildingMeshes: THREE.Group[],
    lightParams: LightParams,
    markerId: number,
    color: string
  ): void {
    if (!this.isComparisonVisible) return;
    
    const colorHex = parseInt(color.replace('#', ''), 16);
    const existing = this.comparisonOverlays.get(markerId);
    if (existing) {
      existing.forEach(line => {
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
    }
    
    const newOverlays = new Map<string, THREE.Line>();
    const sunDir = new THREE.Vector3(
      lightParams.direction.x,
      lightParams.direction.y,
      lightParams.direction.z
    ).normalize();

    for (let i = 0; i < buildings.length; i++) {
      const building = buildings[i];
      const contourPoints = this.generateShadowContour(buildingMeshes[i], sunDir, building);
      
      if (contourPoints.length < 3) continue;

      const linePoints = [...contourPoints, contourPoints[0]];
      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const material = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
      });

      const line = new THREE.Line(geometry, material);
      line.position.y = 0.03;
      line.renderOrder = 2;
      
      this.scene.add(line);
      newOverlays.set(building.id, line);
    }

    this.comparisonOverlays.set(markerId, newOverlays);
  }

  public clearComparisonOverlay(markerId: number): void {
    const existing = this.comparisonOverlays.get(markerId);
    if (existing) {
      existing.forEach(line => {
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      this.comparisonOverlays.delete(markerId);
    }
  }

  public setComparisonVisible(visible: boolean): void {
    this.isComparisonVisible = visible;
    this.comparisonOverlays.forEach(overlayMap => {
      overlayMap.forEach(line => {
        line.visible = visible;
      });
    });
  }

  private clearAllOverlays(): void {
    this.shadowOverlays.forEach(overlay => {
      this.scene.remove(overlay);
      overlay.geometry.dispose();
      (overlay.material as THREE.Material).dispose();
    });
    this.shadowOverlays.clear();
  }

  public setOnShadowUpdate(callback: (results: ShadowResult[]) => void): void {
    this.onShadowUpdate = callback;
  }

  public getLastResults(): ShadowResult[] {
    return [...this.lastResults];
  }

  public dispose(): void {
    this.clearAllOverlays();
    this.comparisonOverlays.forEach(overlayMap => {
      overlayMap.forEach(line => {
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
    });
    this.comparisonOverlays.clear();
  }
}
