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
const SURFACE_U_DIVISIONS = 20;
const SURFACE_V_DIVISIONS = 20;
const PANEL_COUNT = SURFACE_U_DIVISIONS * SURFACE_V_DIVISIONS;

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

  constructor(scene: THREE.Scene, controlPoints?: ControlPoint[]) {
    this.scene = scene;
    this.controlPoints = controlPoints || this.createDefaultControlPoints();
    this.initControlPointMeshes();
    this.initSurface();
  }

  private createDefaultControlPoints(): ControlPoint[] {
    const points: ControlPoint[] = [];
    const halfSize = 4;
    for (let i = 0; i < CONTROL_GRID_SIZE; i++) {
      for (let j = 0; j < CONTROL_GRID_SIZE; j++) {
        const u = (j / (CONTROL_GRID_SIZE - 1) - 0.5) * 2 * halfSize;
        const v = (i / (CONTROL_GRID_SIZE - 1) - 0.5) * 2 * halfSize;
        const wave = Math.sin(u * 0.5) * Math.cos(v * 0.5) * 1.5;
        points.push({ x: u, y: wave, z: v });
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

  private catmullRom(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const t2 = t * t;
    const t3 = t2 * t;
    const v0x = (p2.x - p0.x) * 0.5;
    const v1x = (p3.x - p1.x) * 0.5;
    const v0y = (p2.y - p0.y) * 0.5;
    const v1y = (p3.y - p1.y) * 0.5;
    const v0z = (p2.z - p0.z) * 0.5;
    const v1z = (p3.z - p1.z) * 0.5;

    return new THREE.Vector3(
      (2 * p1.x - 2 * p2.x + v0x + v1x) * t3 + (-3 * p1.x + 3 * p2.x - 2 * v0x - v1x) * t2 + v0x * t + p1.x,
      (2 * p1.y - 2 * p2.y + v0y + v1y) * t3 + (-3 * p1.y + 3 * p2.y - 2 * v0y - v1y) * t2 + v0y * t + p1.y,
      (2 * p1.z - 2 * p2.z + v0z + v1z) * t3 + (-3 * p1.z + 3 * p2.z - 2 * v0z - v1z) * t2 + v0z * t + p1.z
    );
  }

  private getControlPointVector(row: number, col: number): THREE.Vector3 {
    const clampedRow = Math.max(0, Math.min(CONTROL_GRID_SIZE - 1, row));
    const clampedCol = Math.max(0, Math.min(CONTROL_GRID_SIZE - 1, col));
    const idx = clampedRow * CONTROL_GRID_SIZE + clampedCol;
    const p = this.controlPoints[idx];
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  private evaluateSurface(u: number, v: number): THREE.Vector3 {
    const uIdx = u * (CONTROL_GRID_SIZE - 1);
    const vIdx = v * (CONTROL_GRID_SIZE - 1);
    const u0 = Math.floor(uIdx);
    const v0 = Math.floor(vIdx);
    const uT = uIdx - u0;
    const vT = vIdx - v0;

    const rowPoints: THREE.Vector3[] = [];
    for (let i = -1; i <= 2; i++) {
      const p0 = this.getControlPointVector(v0 + i, u0 - 1);
      const p1 = this.getControlPointVector(v0 + i, u0);
      const p2 = this.getControlPointVector(v0 + i, u0 + 1);
      const p3 = this.getControlPointVector(v0 + i, u0 + 2);
      rowPoints.push(this.catmullRom(p0, p1, p2, p3, uT));
    }

    return this.catmullRom(rowPoints[0], rowPoints[1], rowPoints[2], rowPoints[3], vT);
  }

  private initSurface(): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const vertexCols = SURFACE_U_DIVISIONS + 1;
    const vertexRows = SURFACE_V_DIVISIONS + 1;

    for (let i = 0; i < vertexRows; i++) {
      for (let j = 0; j < vertexCols; j++) {
        const u = j / SURFACE_U_DIVISIONS;
        const v = i / SURFACE_V_DIVISIONS;
        const p = this.evaluateSurface(u, v);
        positions.push(p.x, p.y, p.z);
        normals.push(0, 1, 0);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < SURFACE_V_DIVISIONS; i++) {
      for (let j = 0; j < SURFACE_U_DIVISIONS; j++) {
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
    const panelWidth = 8 / SURFACE_U_DIVISIONS;
    const panelHeight = 8 / SURFACE_V_DIVISIONS;

    for (let i = 0; i < PANEL_COUNT; i++) {
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
    const row = Math.floor(index / SURFACE_U_DIVISIONS);
    const col = index % SURFACE_U_DIVISIONS;

    const u1 = col / SURFACE_U_DIVISIONS;
    const u2 = (col + 1) / SURFACE_U_DIVISIONS;
    const v1 = row / SURFACE_V_DIVISIONS;
    const v2 = (row + 1) / SURFACE_V_DIVISIONS;

    const p00 = this.evaluateSurface(u1, v1);
    const p10 = this.evaluateSurface(u2, v1);
    const p01 = this.evaluateSurface(u1, v2);
    const p11 = this.evaluateSurface(u2, v2);

    const center = new THREE.Vector3()
      .add(p00).add(p10).add(p01).add(p11)
      .multiplyScalar(0.25);

    const tangentU = new THREE.Vector3().subVectors(p10, p00).normalize();
    const tangentV = new THREE.Vector3().subVectors(p01, p00).normalize();
    const normal = new THREE.Vector3().crossVectors(tangentU, tangentV).normalize();

    const up = new THREE.Vector3(0, 1, 0);
    if (normal.dot(up) < 0) normal.negate();

    mesh.position.copy(center);
    mesh.lookAt(center.clone().add(normal));
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
    const vertexCols = SURFACE_U_DIVISIONS + 1;
    const vertexRows = SURFACE_V_DIVISIONS + 1;

    for (let i = 0; i < vertexRows; i++) {
      for (let j = 0; j < vertexCols; j++) {
        const u = j / SURFACE_U_DIVISIONS;
        const v = i / SURFACE_V_DIVISIONS;
        const p = this.evaluateSurface(u, v);
        const idx = (i * vertexCols + j) * 3;
        positions[idx] = p.x;
        positions[idx + 1] = p.y;
        positions[idx + 2] = p.z;
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
      const progress = Math.min(elapsed / 200, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const startColor = userData.startColor as THREE.Color;
      const targetColor = userData.targetColor as THREE.Color;
      material.color.lerpColors(startColor, targetColor, easeProgress);

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
    return PANEL_COUNT;
  }

  public getControlGridSize(): number {
    return CONTROL_GRID_SIZE;
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
