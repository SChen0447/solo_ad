import * as THREE from 'three';
import { DrillData, StratumData } from './types';

export class StratumGenerator {
  private scene: THREE.Scene;
  private stratumMeshes: Map<string, THREE.Mesh[]> = new Map();
  private stratumBoundaries: Map<string, THREE.Mesh> = new Map();

  private gridSize: number = 20;
  private resolution: number = 40;
  private currentOpacity: number = 1;

  private stratumColors: string[] = [];
  private stratumNames: string[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  generateStrata(drills: DrillData[]): void {
    this.clear();

    if (drills.length < 2) return;

    const allStrataNames = this.getAllStratumNames(drills);
    this.stratumNames = allStrataNames;

    const stratumDepths = this.getStratumDepthsByName(drills, allStrataNames);

    allStrataNames.forEach((stratumName, layerIndex) => {
      const boundaryDepths: { x: number; z: number; depth: number }[] = [];

      drills.forEach((drill) => {
        const stratum = drill.strata.find((s) => s.name === stratumName);
        if (stratum) {
          boundaryDepths.push({
            x: drill.x,
            z: drill.z,
            depth: stratum.depth
          });
        }
      });

      if (boundaryDepths.length >= 2) {
        this.createStratumBoundary(
          stratumName,
          layerIndex,
          boundaryDepths,
          this.getStratumColor(stratumName, drills)
        );
      }
    });

    this.createLayerBodies(allStrataNames, drills);
  }

  private getStratumColor(stratumName: string, drills: DrillData[]): string {
    for (const drill of drills) {
      const stratum = drill.strata.find((s) => s.name === stratumName);
      if (stratum) {
        return stratum.color;
      }
    }
    return '#888888';
  }

  private getAllStratumNames(drills: DrillData[]): string[] {
    const nameSet = new Set<string>();
    const depthMap = new Map<string, number>();

    drills.forEach((drill) => {
      drill.strata.forEach((stratum) => {
        nameSet.add(stratum.name);
        const existingDepth = depthMap.get(stratum.name);
        if (existingDepth === undefined || stratum.depth < existingDepth) {
          depthMap.set(stratum.name, stratum.depth);
        }
      });
    });

    const names = Array.from(nameSet);
    names.sort((a, b) => {
      const depthA = depthMap.get(a) || 0;
      const depthB = depthMap.get(b) || 0;
      return depthA - depthB;
    });

    return names;
  }

  private getStratumDepthsByName(
    drills: DrillData[],
    stratumNames: string[]
  ): Map<string, { x: number; z: number; depth: number }[]> {
    const result = new Map<string, { x: number; z: number; depth: number }[]>();

    stratumNames.forEach((name) => {
      result.set(name, []);
    });

    drills.forEach((drill) => {
      drill.strata.forEach((stratum) => {
        const arr = result.get(stratum.name);
        if (arr) {
          arr.push({ x: drill.x, z: drill.z, depth: stratum.depth });
        }
      });
    });

    return result;
  }

  private createStratumBoundary(
    name: string,
    layerIndex: number,
    points: { x: number; z: number; depth: number }[],
    color: string
  ): void {
    const halfSize = this.gridSize / 2;
    const cellSize = this.gridSize / this.resolution;

    const geometry = new THREE.PlaneGeometry(
      this.gridSize,
      this.gridSize,
      this.resolution,
      this.resolution
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const depth = this.idwInterpolate(x, z, points);
      positions.setY(i, -depth);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.4 * this.currentOpacity,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = `boundary_${name}`;
    mesh.userData.stratumName = name;
    mesh.userData.layerIndex = layerIndex;

    this.scene.add(mesh);
    this.stratumBoundaries.set(name, mesh);
  }

  private createLayerBodies(stratumNames: string[], drills: DrillData[]): void {
    for (let i = 0; i < stratumNames.length; i++) {
      const layerName = stratumNames[i];
      const topName = i === 0 ? 'surface' : stratumNames[i - 1];
      const bottomName = layerName;

      const color = this.getStratumColor(layerName, drills);

      const topBoundary = i === 0 ? 0 : this.getBoundaryDepthMap(topName, drills);
      const bottomBoundary = this.getBoundaryDepthMap(bottomName, drills);

      if (!bottomBoundary) continue;

      this.createLayerVolume(
        layerName,
        i,
        topBoundary,
        bottomBoundary,
        color,
        drills
      );
    }
  }

  private getBoundaryDepthMap(
    name: string,
    drills: DrillData[]
  ): { x: number; z: number; depth: number }[] | null {
    const points: { x: number; z: number; depth: number }[] = [];

    for (const drill of drills) {
      const stratum = drill.strata.find((s) => s.name === name);
      if (stratum) {
        points.push({ x: drill.x, z: drill.z, depth: stratum.depth });
      }
    }

    return points.length >= 2 ? points : null;
  }

  private createLayerVolume(
    name: string,
    layerIndex: number,
    topBoundary: { x: number; z: number; depth: number }[] | number,
    bottomBoundary: { x: number; z: number; depth: number }[],
    color: string,
    _drills: DrillData[]
  ): void {
    const halfSize = this.gridSize / 2;
    const segments = this.resolution;

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];

    const topColor = new THREE.Color(color);
    const bottomColor = topColor.clone().multiplyScalar(0.8);

    const step = this.gridSize / segments;

    const topDepths: number[][] = [];
    const bottomDepths: number[][] = [];

    for (let i = 0; i <= segments; i++) {
      topDepths[i] = [];
      bottomDepths[i] = [];
      for (let j = 0; j <= segments; j++) {
        const x = -halfSize + i * step;
        const z = -halfSize + j * step;

        if (typeof topBoundary === 'number') {
          topDepths[i][j] = topBoundary;
        } else {
          topDepths[i][j] = this.idwInterpolate(x, z, topBoundary);
        }

        bottomDepths[i][j] = this.idwInterpolate(x, z, bottomBoundary);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const x0 = -halfSize + i * step;
        const x1 = -halfSize + (i + 1) * step;
        const z0 = -halfSize + j * step;
        const z1 = -halfSize + (j + 1) * step;

        const t00 = -topDepths[i][j];
        const t10 = -topDepths[i + 1][j];
        const t01 = -topDepths[i][j + 1];
        const t11 = -topDepths[i + 1][j + 1];

        const b00 = -bottomDepths[i][j];
        const b10 = -bottomDepths[i + 1][j];
        const b01 = -bottomDepths[i][j + 1];
        const b11 = -bottomDepths[i + 1][j + 1];

        this.addQuad(
          vertices,
          colors,
          x0, t00, z0,
          x1, t10, z0,
          x1, t11, z1,
          x0, t01, z1,
          topColor,
          true
        );

        this.addQuad(
          vertices,
          colors,
          x0, b00, z0,
          x0, b01, z1,
          x1, b11, z1,
          x1, b10, z0,
          bottomColor,
          false
        );

        this.addQuad(
          vertices,
          colors,
          x0, t00, z0,
          x0, b00, z0,
          x1, b10, z0,
          x1, t10, z0,
          topColor,
          false
        );

        this.addQuad(
          vertices,
          colors,
          x0, t01, z1,
          x1, t11, z1,
          x1, b11, z1,
          x0, b01, z1,
          topColor,
          false
        );

        this.addQuad(
          vertices,
          colors,
          x0, t00, z0,
          x0, t01, z1,
          x0, b01, z1,
          x0, b00, z0,
          topColor,
          false
        );

        this.addQuad(
          vertices,
          colors,
          x1, t10, z0,
          x1, b10, z0,
          x1, b11, z1,
          x1, t11, z1,
          topColor,
          false
        );
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3 * this.currentOpacity,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `stratum_${name}`;
    mesh.userData.stratumName = name;
    mesh.userData.layerIndex = layerIndex;

    this.scene.add(mesh);

    if (!this.stratumMeshes.has(name)) {
      this.stratumMeshes.set(name, []);
    }
    this.stratumMeshes.get(name)!.push(mesh);
  }

  private addQuad(
    vertices: number[],
    colors: number[],
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    x3: number, y3: number, z3: number,
    color: THREE.Color,
    lerpColor: boolean
  ): void {
    vertices.push(x0, y0, z0);
    vertices.push(x1, y1, z1);
    vertices.push(x2, y2, z2);

    vertices.push(x0, y0, z0);
    vertices.push(x2, y2, z2);
    vertices.push(x3, y3, z3);

    const c0 = lerpColor ? this.getLerpedColor(color, y0) : color;
    const c1 = lerpColor ? this.getLerpedColor(color, y1) : color;
    const c2 = lerpColor ? this.getLerpedColor(color, y2) : color;
    const c3 = lerpColor ? this.getLerpedColor(color, y3) : color;

    for (let i = 0; i < 6; i++) {
      let c;
      if (i === 0 || i === 3) c = c0;
      else if (i === 1) c = c1;
      else if (i === 2 || i === 4) c = c2;
      else c = c3;

      colors.push(c.r, c.g, c.b);
    }
  }

  private getLerpedColor(baseColor: THREE.Color, _y: number): THREE.Color {
    return baseColor;
  }

  private idwInterpolate(
    x: number,
    z: number,
    points: { x: number; z: number; depth: number }[]
  ): number {
    const power = 2;
    let weightSum = 0;
    let weightedSum = 0;

    for (const point of points) {
      const dx = x - point.x;
      const dz = z - point.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < 0.001) {
        return point.depth;
      }

      const weight = 1 / Math.pow(distance, power);
      weightedSum += weight * point.depth;
      weightSum += weight;
    }

    return weightSum > 0 ? weightedSum / weightSum : 0;
  }

  setOpacity(opacity: number): void {
    this.currentOpacity = opacity;

    this.stratumBoundaries.forEach((mesh) => {
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.opacity = 0.4 * opacity;
        mesh.material.transparent = true;
      }
    });

    this.stratumMeshes.forEach((meshes) => {
      meshes.forEach((mesh) => {
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
          mesh.material.opacity = 0.3 * opacity;
          mesh.material.transparent = true;
        }
      });
    });
  }

  clear(): void {
    this.stratumBoundaries.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    this.stratumBoundaries.clear();

    this.stratumMeshes.forEach((meshes) => {
      meshes.forEach((mesh) => {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      });
    });
    this.stratumMeshes.clear();

    this.stratumColors = [];
    this.stratumNames = [];
  }
}
