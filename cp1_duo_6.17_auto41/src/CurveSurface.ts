import * as THREE from 'three';

export interface ControlPoint {
  x: number;
  y: number;
  z: number;
}

export interface PanelMaterialParams {
  color: string;
  opacity: number;
  metalness: number;
  roughness: number;
}

const CONTROL_GRID_SIZE = 6;
const MATERIAL_TRANSITION_DURATION = 200;

export interface SurfaceConfig {
  uDivisions?: number;
  vDivisions?: number;
}

export class CurveSurface {
  private scene: THREE.Scene;
  private controlPoints: ControlPoint[];
  private controlPointMeshes: THREE.Mesh[] = [];
  private panels: THREE.Mesh[] = [];
  private surfaceGeometry: THREE.BufferGeometry | null = null;
  private positionAttribute: THREE.BufferAttribute | null = null;
  private panelGeometries: THREE.PlaneGeometry[] = [];
  private defaultMaterialParams: PanelMaterialParams = {
    color: '#8ab4f8',
    opacity: 0.7,
    metalness: 0.6,
    roughness: 0.25
  };
  private selectedPanels: Set<number> = new Set();
  private highlightEdges: THREE.LineSegments[] = [];

  private uDivisions: number;
  private vDivisions: number;
  private panelCount: number;

  private _tmpVec0: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec1: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec2: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec3: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec4: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec5: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec6: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec7: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec8: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec9: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec10: THREE.Vector3 = new THREE.Vector3();
  private _tmpVec11: THREE.Vector3 = new THREE.Vector3();
  private _tmpColor: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene, controlPoints?: ControlPoint[], config?: SurfaceConfig) {
    this.scene = scene;
    this.uDivisions = config?.uDivisions ?? 20;
    this.vDivisions = config?.vDivisions ?? 20;
    this.panelCount = this.uDivisions * this.vDivisions;
    this.controlPoints = controlPoints || this.createDefaultControlPoints();
    this.initControlPointMeshes();
    this.initSurface();
  }

  private createDefaultControlPoints(): ControlPoint[] {
    const points: ControlPoint[] = [];
    const halfSize = 4;
    for (let i = 0; i < CONTROL_GRID_SIZE; i++) {
      for (let j = 0; j < CONTROL_GRID_SIZE; j++) {
        const x = (j / (CONTROL_GRID_SIZE - 1) - 0.5) * 2 * halfSize;
        const z = (i / (CONTROL_GRID_SIZE - 1) - 0.5) * 2 * halfSize;
        const y = Math.sin(x * 0.6) * Math.cos(z * 0.6) * 2.0 + Math.sin(x * 0.3 + z * 0.4) * 0.8;
        points.push({ x, y, z });
      }
    }
    return points;
  }

  private initControlPointMeshes(): void {
    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xd4af37,
      emissiveIntensity: 0.2
    });

    for (let i = 0; i < this.controlPoints.length; i++) {
      const geometry = new THREE.SphereGeometry(0.3, 32, 32);
      const mesh = new THREE.Mesh(geometry, goldMaterial);
      const p = this.controlPoints[i];
      mesh.position.set(p.x, p.y, p.z);
      mesh.userData = { controlPointIndex: i };
      this.scene.add(mesh);
      this.controlPointMeshes.push(mesh);
    }
  }

  private catmullRom(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
    const t2 = t * t;
    const t3 = t2 * t;
    const v0x = (p2.x - p0.x) * 0.5;
    const v1x = (p3.x - p1.x) * 0.5;
    const v0y = (p2.y - p0.y) * 0.5;
    const v1y = (p3.y - p1.y) * 0.5;
    const v0z = (p2.z - p0.z) * 0.5;
    const v1z = (p3.z - p1.z) * 0.5;

    return out.set(
      (2 * p1.x - 2 * p2.x + v0x + v1x) * t3 + (-3 * p1.x + 3 * p2.x - 2 * v0x - v1x) * t2 + v0x * t + p1.x,
      (2 * p1.y - 2 * p2.y + v0y + v1y) * t3 + (-3 * p1.y + 3 * p2.y - 2 * v0y - v1y) * t2 + v0y * t + p1.y,
      (2 * p1.z - 2 * p2.z + v0z + v1z) * t3 + (-3 * p1.z + 3 * p2.z - 2 * v0z - v1z) * t2 + v0z * t + p1.z
    );
  }

  private getControlPointVector(row: number, col: number, out: THREE.Vector3): THREE.Vector3 {
    const clampedRow = Math.max(0, Math.min(CONTROL_GRID_SIZE - 1, row));
    const clampedCol = Math.max(0, Math.min(CONTROL_GRID_SIZE - 1, col));
    const idx = clampedRow * CONTROL_GRID_SIZE + clampedCol;
    const p = this.controlPoints[idx];
    return out.set(p.x, p.y, p.z);
  }

  private evaluateSurface(u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
    const uIdx = u * (CONTROL_GRID_SIZE - 1);
    const vIdx = v * (CONTROL_GRID_SIZE - 1);
    const u0 = Math.floor(uIdx);
    const v0 = Math.floor(vIdx);
    const uT = uIdx - u0;
    const vT = vIdx - v0;

    const tmpP0 = this._tmpVec0;
    const tmpP1 = this._tmpVec1;
    const tmpP2 = this._tmpVec2;
    const tmpP3 = this._tmpVec3;

    const r0 = this._tmpVec4;
    const r1 = this._tmpVec5;
    const r2 = this._tmpVec6;
    const r3 = this._tmpVec7;

    this.getControlPointVector(v0 - 1, u0 - 1, tmpP0);
    this.getControlPointVector(v0 - 1, u0, tmpP1);
    this.getControlPointVector(v0 - 1, u0 + 1, tmpP2);
    this.getControlPointVector(v0 - 1, u0 + 2, tmpP3);
    this.catmullRom(tmpP0, tmpP1, tmpP2, tmpP3, uT, r0);

    this.getControlPointVector(v0, u0 - 1, tmpP0);
    this.getControlPointVector(v0, u0, tmpP1);
    this.getControlPointVector(v0, u0 + 1, tmpP2);
    this.getControlPointVector(v0, u0 + 2, tmpP3);
    this.catmullRom(tmpP0, tmpP1, tmpP2, tmpP3, uT, r1);

    this.getControlPointVector(v0 + 1, u0 - 1, tmpP0);
    this.getControlPointVector(v0 + 1, u0, tmpP1);
    this.getControlPointVector(v0 + 1, u0 + 1, tmpP2);
    this.getControlPointVector(v0 + 1, u0 + 2, tmpP3);
    this.catmullRom(tmpP0, tmpP1, tmpP2, tmpP3, uT, r2);

    this.getControlPointVector(v0 + 2, u0 - 1, tmpP0);
    this.getControlPointVector(v0 + 2, u0, tmpP1);
    this.getControlPointVector(v0 + 2, u0 + 1, tmpP2);
    this.getControlPointVector(v0 + 2, u0 + 2, tmpP3);
    this.catmullRom(tmpP0, tmpP1, tmpP2, tmpP3, uT, r3);

    return this.catmullRom(r0, r1, r2, r3, vT, out);
  }

  private initSurface(): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const vertexCols = this.uDivisions + 1;
    const vertexRows = this.vDivisions + 1;
    const tmpPoint = this._tmpVec8;

    for (let i = 0; i < vertexRows; i++) {
      for (let j = 0; j < vertexCols; j++) {
        const u = j / this.uDivisions;
        const v = i / this.vDivisions;
        this.evaluateSurface(u, v, tmpPoint);
        positions.push(tmpPoint.x, tmpPoint.y, tmpPoint.z);
        normals.push(0, 1, 0);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < this.vDivisions; i++) {
      for (let j = 0; j < this.uDivisions; j++) {
        const a = i * vertexCols + j;
        const b = a + 1;
        const c = a + vertexCols;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    this.surfaceGeometry = new THREE.BufferGeometry();
    this.positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
    this.surfaceGeometry.setAttribute('position', this.positionAttribute);
    this.surfaceGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.surfaceGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.surfaceGeometry.setIndex(indices);
    this.surfaceGeometry.computeVertexNormals();

    this.createIndividualPanels();
  }

  private createIndividualPanels(): void {
    const panelWidth = 8 / this.uDivisions;
    const panelHeight = 8 / this.vDivisions;

    for (let i = 0; i < this.panelCount; i++) {
      const geometry = new THREE.PlaneGeometry(panelWidth * 0.95, panelHeight * 0.95);
      const material = new THREE.MeshStandardMaterial({
        color: this.defaultMaterialParams.color,
        transparent: true,
        opacity: this.defaultMaterialParams.opacity,
        metalness: this.defaultMaterialParams.metalness,
        roughness: this.defaultMaterialParams.roughness,
        side: THREE.DoubleSide,
        envMapIntensity: 1.0,
        userData: {
          targetColor: new THREE.Color(this.defaultMaterialParams.color),
          targetOpacity: this.defaultMaterialParams.opacity,
          targetMetalness: this.defaultMaterialParams.metalness,
          targetRoughness: this.defaultMaterialParams.roughness,
          transitionActive: false,
          transitionProgress: 0
        }
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { panelIndex: i };
      this.updatePanelPosition(i, mesh);

      const edgeGeom = new THREE.EdgesGeometry(geometry);
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0
      });
      const edges = new THREE.LineSegments(edgeGeom, edgeMat);
      edges.userData = { panelIndex: i };
      mesh.add(edges);
      this.highlightEdges.push(edges);

      this.scene.add(mesh);
      this.panels.push(mesh);
      this.panelGeometries.push(geometry);
    }
  }

  private updatePanelPosition(index: number, mesh: THREE.Mesh): void {
    const row = Math.floor(index / this.uDivisions);
    const col = index % this.uDivisions;

    const u1 = col / this.uDivisions;
    const u2 = (col + 1) / this.uDivisions;
    const v1 = row / this.vDivisions;
    const v2 = (row + 1) / this.vDivisions;

    const p00 = this._tmpVec0;
    const p10 = this._tmpVec1;
    const p01 = this._tmpVec2;
    const p11 = this._tmpVec3;
    const center = this._tmpVec8;
    const tangentU = this._tmpVec4;
    const tangentV = this._tmpVec5;
    const normal = this._tmpVec6;
    const up = this._tmpVec7;
    const lookTarget = this._tmpVec9;

    this.evaluateSurface(u1, v1, p00);
    this.evaluateSurface(u2, v1, p10);
    this.evaluateSurface(u1, v2, p01);
    this.evaluateSurface(u2, v2, p11);

    center.set(0, 0, 0).add(p00).add(p10).add(p01).add(p11).multiplyScalar(0.25);

    tangentU.copy(p10).sub(p00).normalize();
    tangentV.copy(p01).sub(p00).normalize();
    normal.crossVectors(tangentU, tangentV).normalize();

    up.set(0, 1, 0);
    if (normal.dot(up) < 0) normal.negate();

    mesh.position.copy(center);
    lookTarget.copy(center).add(normal);
    mesh.lookAt(lookTarget);
  }

  public updateControlPoints(points: ControlPoint[]): void {
    if (points.length !== this.controlPoints.length) return;

    for (let i = 0; i < points.length; i++) {
      this.controlPoints[i] = { ...points[i] };
      this.controlPointMeshes[i].position.set(points[i].x, points[i].y, points[i].z);
    }

    this.updateSurfacePositions();

    for (let i = 0; i < this.panels.length; i++) {
      this.updatePanelPosition(i, this.panels[i]);
    }
  }

  private updateSurfacePositions(): void {
    if (!this.positionAttribute) return;

    const positions = this.positionAttribute.array as Float32Array;
    const vertexCols = this.uDivisions + 1;
    const vertexRows = this.vDivisions + 1;
    const tmpPoint = this._tmpVec8;

    for (let i = 0; i < vertexRows; i++) {
      for (let j = 0; j < vertexCols; j++) {
        const u = j / this.uDivisions;
        const v = i / this.vDivisions;
        this.evaluateSurface(u, v, tmpPoint);
        const idx = (i * vertexCols + j) * 3;
        positions[idx] = tmpPoint.x;
        positions[idx + 1] = tmpPoint.y;
        positions[idx + 2] = tmpPoint.z;
      }
    }

    this.positionAttribute.needsUpdate = true;
    if (this.surfaceGeometry) {
      this.surfaceGeometry.computeVertexNormals();
    }
  }

  public updateSingleControlPoint(index: number, point: ControlPoint): void {
    if (index < 0 || index >= this.controlPoints.length) return;

    this.controlPoints[index] = { ...point };
    this.controlPointMeshes[index].position.set(point.x, point.y, point.z);

    this.updateSurfacePositions();

    for (let i = 0; i < this.panels.length; i++) {
      this.updatePanelPosition(i, this.panels[i]);
    }
  }

  public setSelectedPanels(indices: number[]): void {
    this.selectedPanels.clear();
    indices.forEach(i => this.selectedPanels.add(i));

    for (let i = 0; i < this.highlightEdges.length; i++) {
      const mat = this.highlightEdges[i].material as THREE.LineBasicMaterial;
      const targetOpacity = this.selectedPanels.has(i) ? 1 : 0;
      this.animateEdgeOpacity(mat, targetOpacity);
    }
  }

  private animateEdgeOpacity(material: THREE.LineBasicMaterial, targetOpacity: number): void {
    const startOpacity = material.opacity;
    const startTime = performance.now();
    const duration = 200;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      material.opacity = startOpacity + (targetOpacity - startOpacity) * easeProgress;
      material.transparent = material.opacity < 1;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  public getSelectedPanels(): number[] {
    return Array.from(this.selectedPanels);
  }

  public updateMaterialForSelected(params: Partial<PanelMaterialParams>): void {
    const affectedPanels = this.selectedPanels.size > 0
      ? Array.from(this.selectedPanels)
      : this.panels.map((_, i) => i);

    for (const idx of affectedPanels) {
      const mesh = this.panels[idx];
      const material = mesh.material as THREE.MeshStandardMaterial;
      const userData = material.userData as Record<string, unknown>;

      if (params.color) {
        (userData.targetColor as THREE.Color).set(params.color);
      }
      if (params.opacity !== undefined) {
        userData.targetOpacity = params.opacity;
      }
      if (params.metalness !== undefined) {
        userData.targetMetalness = params.metalness;
      }
      if (params.roughness !== undefined) {
        userData.targetRoughness = params.roughness;
      }

      userData.transitionActive = true;
      userData.transitionProgress = 0;
      userData.transitionStart = performance.now();
      userData.startColor = material.color.clone();
      userData.startOpacity = material.opacity;
      userData.startMetalness = material.metalness;
      userData.startRoughness = material.roughness;
    }
  }

  public updateMaterialTransitions(): void {
    for (let i = 0; i < this.panels.length; i++) {
      const material = this.panels[i].material as THREE.MeshStandardMaterial;
      const userData = material.userData as Record<string, unknown>;

      if (!userData.transitionActive) continue;

      const now = performance.now();
      const elapsed = now - (userData.transitionStart as number);
      const progress = Math.min(elapsed / MATERIAL_TRANSITION_DURATION, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const startColor = userData.startColor as THREE.Color;
      const targetColor = userData.targetColor as THREE.Color;
      this._tmpColor.copy(startColor).lerp(targetColor, easeProgress);
      material.color.copy(this._tmpColor);

      material.opacity = (userData.startOpacity as number) +
        ((userData.targetOpacity as number) - (userData.startOpacity as number)) * easeProgress;

      material.metalness = (userData.startMetalness as number) +
        ((userData.targetMetalness as number) - (userData.startMetalness as number)) * easeProgress;

      material.roughness = (userData.startRoughness as number) +
        ((userData.targetRoughness as number) - (userData.startRoughness as number)) * easeProgress;

      if (progress >= 1) {
        userData.transitionActive = false;
      }
    }
  }

  public setEnvMap(envMap: THREE.Texture | null): void {
    for (const mesh of this.panels) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.envMap = envMap;
      material.needsUpdate = true;
    }
  }

  public getPanels(): THREE.Mesh[] {
    return this.panels;
  }

  public getControlPointMeshes(): THREE.Mesh[] {
    return this.controlPointMeshes;
  }

  public getControlPoints(): ControlPoint[] {
    return [...this.controlPoints];
  }

  public getPanelCount(): number {
    return this.panelCount;
  }

  public getControlGridSize(): number {
    return CONTROL_GRID_SIZE;
  }

  public getDivisions(): { u: number; v: number } {
    return { u: this.uDivisions, v: this.vDivisions };
  }

  public setDivisions(uDivisions: number, vDivisions: number): void {
    this.uDivisions = Math.max(2, Math.min(30, Math.floor(uDivisions)));
    this.vDivisions = Math.max(2, Math.min(30, Math.floor(vDivisions)));
    this.panelCount = this.uDivisions * this.vDivisions;

    for (const mesh of this.panels) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.panels = [];
    this.panelGeometries = [];
    this.highlightEdges = [];

    if (this.surfaceGeometry) {
      this.surfaceGeometry.dispose();
    }

    this.initSurface();
    this.setSelectedPanels([]);
  }

  public dispose(): void {
    for (const mesh of this.controlPointMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }

    for (const mesh of this.panels) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }

    if (this.surfaceGeometry) {
      this.surfaceGeometry.dispose();
    }
  }
}
