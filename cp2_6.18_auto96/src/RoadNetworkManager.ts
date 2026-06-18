import * as THREE from 'three';

interface SegmentInfo {
  id: string;
  mesh: THREE.Mesh;
  baseColor: THREE.Color;
  highlightMesh: THREE.LineSegments | null;
  isHighlighted: boolean;
  lodGroup: THREE.Group;
  position: THREE.Vector3;
  start: THREE.Vector3;
  end: THREE.Vector3;
  isHorizontal: boolean;
}

const GRID_SIZE = 5;
const ROAD_WIDTH = 4;
const ROAD_LENGTH = 20;
const INTERSECTION_SIZE = 8;
const SPACING = ROAD_LENGTH + INTERSECTION_SIZE;

const COLOR_GREEN = new THREE.Color(0x22c55e);
const COLOR_YELLOW = new THREE.Color(0xeab308);
const COLOR_RED = new THREE.Color(0xef4444);
const COLOR_DEFAULT = new THREE.Color(0x333333);

export interface SegmentPath {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  isHorizontal: boolean;
}

export class RoadNetworkManager {
  private scene: THREE.Scene;
  private segments: Map<string, SegmentInfo> = new Map();
  private segmentMeshes: THREE.Mesh[] = [];
  private roadGroup: THREE.Group;
  private intersectionGroup: THREE.Group;
  private lodLevel: number = 0;
  private lodLowGroup: THREE.Group;
  private lodMidGroup: THREE.Group;
  private gridLinesGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.roadGroup = new THREE.Group();
    this.intersectionGroup = new THREE.Group();
    this.lodLowGroup = new THREE.Group();
    this.lodMidGroup = new THREE.Group();
    this.gridLinesGroup = new THREE.Group();
    this.lodLowGroup.visible = false;
    this.lodMidGroup.visible = false;
  }

  build(): void {
    const offsetX = -((GRID_SIZE - 1) * SPACING) / 2;
    const offsetZ = -((GRID_SIZE - 1) * SPACING) / 2;

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE - 1; j++) {
        this.createHorizontalSegment(i, j, offsetX, offsetZ);
      }
    }

    for (let i = 0; i < GRID_SIZE - 1; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        this.createVerticalSegment(i, j, offsetX, offsetZ);
      }
    }

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        this.createIntersection(i, j, offsetX, offsetZ);
      }
    }

    this.createGridLines(offsetX, offsetZ);
    this.buildLODMeshes(offsetX, offsetZ);

    this.scene.add(this.roadGroup);
    this.scene.add(this.intersectionGroup);
    this.scene.add(this.gridLinesGroup);
    this.scene.add(this.lodLowGroup);
    this.scene.add(this.lodMidGroup);
  }

  private createHorizontalSegment(
    row: number,
    col: number,
    offsetX: number,
    offsetZ: number
  ): void {
    const id = `h_${row}_${col}`;
    const x0 = offsetX + col * SPACING + INTERSECTION_SIZE / 2;
    const x1 = offsetX + (col + 1) * SPACING - INTERSECTION_SIZE / 2;
    const z = offsetZ + row * SPACING;
    const cx = (x0 + x1) / 2;
    const cz = z;

    const geometry = new THREE.PlaneGeometry(x1 - x0, ROAD_WIDTH, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: COLOR_DEFAULT.clone(),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(cx, 0.01, cz);
    mesh.userData = { segmentId: id };
    mesh.receiveShadow = true;

    const lodGroup = new THREE.Group();
    lodGroup.add(mesh);
    this.roadGroup.add(lodGroup);

    const start = new THREE.Vector3(x0, 0.05, cz);
    const end = new THREE.Vector3(x1, 0.05, cz);

    this.segments.set(id, {
      id,
      mesh,
      baseColor: COLOR_DEFAULT.clone(),
      highlightMesh: null,
      isHighlighted: false,
      lodGroup,
      position: new THREE.Vector3(cx, 0, cz),
      start,
      end,
      isHorizontal: true,
    });

    this.segmentMeshes.push(mesh);
  }

  private createVerticalSegment(
    row: number,
    col: number,
    offsetX: number,
    offsetZ: number
  ): void {
    const id = `v_${row}_${col}`;
    const x = offsetX + col * SPACING;
    const z0 = offsetZ + row * SPACING + INTERSECTION_SIZE / 2;
    const z1 = offsetZ + (row + 1) * SPACING - INTERSECTION_SIZE / 2;
    const cx = x;
    const cz = (z0 + z1) / 2;

    const geometry = new THREE.PlaneGeometry(ROAD_WIDTH, z1 - z0, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: COLOR_DEFAULT.clone(),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(cx, 0.01, cz);
    mesh.userData = { segmentId: id };
    mesh.receiveShadow = true;

    const lodGroup = new THREE.Group();
    lodGroup.add(mesh);
    this.roadGroup.add(lodGroup);

    const start = new THREE.Vector3(cx, 0.05, z0);
    const end = new THREE.Vector3(cx, 0.05, z1);

    this.segments.set(id, {
      id,
      mesh,
      baseColor: COLOR_DEFAULT.clone(),
      highlightMesh: null,
      isHighlighted: false,
      lodGroup,
      position: new THREE.Vector3(cx, 0, cz),
      start,
      end,
      isHorizontal: false,
    });

    this.segmentMeshes.push(mesh);
  }

  private createIntersection(
    row: number,
    col: number,
    offsetX: number,
    offsetZ: number
  ): void {
    const x = offsetX + col * SPACING;
    const z = offsetZ + row * SPACING;

    const geometry = new THREE.PlaneGeometry(INTERSECTION_SIZE, INTERSECTION_SIZE, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 0.005, z);
    mesh.receiveShadow = true;
    this.intersectionGroup.add(mesh);

    const glowGeom = new THREE.CircleGeometry(10, 32);
    glowGeom.rotateX(-Math.PI / 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.set(x, 0.02, z);
    this.intersectionGroup.add(glow);
  }

  private createGridLines(offsetX: number, offsetZ: number): void {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });

    const points: THREE.Vector3[] = [];

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE - 1; j++) {
        const id = `h_${i}_${j}`;
        const seg = this.segments.get(id)!;
        const hw = ROAD_WIDTH / 2;
        points.push(
          new THREE.Vector3(seg.start.x, 0.02, seg.position.z - hw),
          new THREE.Vector3(seg.end.x, 0.02, seg.position.z - hw),
          new THREE.Vector3(seg.start.x, 0.02, seg.position.z + hw),
          new THREE.Vector3(seg.end.x, 0.02, seg.position.z + hw)
        );
      }
    }

    for (let i = 0; i < GRID_SIZE - 1; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const id = `v_${i}_${j}`;
        const seg = this.segments.get(id)!;
        const hw = ROAD_WIDTH / 2;
        points.push(
          new THREE.Vector3(seg.position.x - hw, 0.02, seg.start.z),
          new THREE.Vector3(seg.position.x - hw, 0.02, seg.end.z),
          new THREE.Vector3(seg.position.x + hw, 0.02, seg.start.z),
          new THREE.Vector3(seg.position.x + hw, 0.02, seg.end.z)
        );
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const lines = new THREE.LineSegments(geometry, lineMat);
    this.gridLinesGroup.add(lines);
  }

  private buildLODMeshes(offsetX: number, offsetZ: number): void {
    this.buildMidLOD(offsetX, offsetZ);
    this.buildLowLOD(offsetX, offsetZ);
  }

  private buildMidLOD(offsetX: number, offsetZ: number): void {
    const mergedGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    const quads: { cx: number; cz: number; hw: number; hh: number }[] = [];

    for (let i = 0; i < GRID_SIZE - 1; i += 2) {
      for (let j = 0; j < GRID_SIZE - 1; j += 2) {
        const cx = offsetX + j * SPACING + SPACING / 2;
        const cz = offsetZ + i * SPACING + SPACING / 2;
        const hw = SPACING;
        const hh = SPACING;
        quads.push({ cx, cz, hw, hh });
      }
    }

    for (const q of quads) {
      const x0 = q.cx - q.hw;
      const x1 = q.cx + q.hw;
      const z0 = q.cz - q.hh;
      const z1 = q.cz + q.hh;

      positions.push(
        x0, 0.015, z0,
        x1, 0.015, z0,
        x1, 0.015, z1,
        x0, 0.015, z0,
        x1, 0.015, z1,
        x0, 0.015, z1
      );

      const c = COLOR_DEFAULT;
      for (let k = 0; k < 6; k++) {
        colors.push(c.r, c.g, c.b);
      }
    }

    mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(mergedGeo, mat);
    this.lodMidGroup.add(mesh);
  }

  private buildLowLOD(offsetX: number, offsetZ: number): void {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = offsetX + j * SPACING;
        const z = offsetZ + i * SPACING;

        const geo = new THREE.PlaneGeometry(6, 6, 1, 1);
        geo.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshBasicMaterial({
          color: COLOR_DEFAULT.clone(),
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, 0.02, z);
        mesh.userData = { intersectionRow: i, intersectionCol: j };
        this.lodLowGroup.add(mesh);
      }
    }
  }

  getSegmentIds(): string[] {
    return Array.from(this.segments.keys());
  }

  getSegmentPaths(): SegmentPath[] {
    const paths: SegmentPath[] = [];
    this.segments.forEach((seg) => {
      paths.push({
        id: seg.id,
        start: seg.start.clone(),
        end: seg.end.clone(),
        isHorizontal: seg.isHorizontal,
      });
    });
    return paths;
  }

  getHoverMeshes(): THREE.Mesh[] {
    return this.segmentMeshes;
  }

  setTrafficDensity(densityMap: Map<string, number>): void {
    densityMap.forEach((density, id) => {
      const seg = this.segments.get(id);
      if (!seg) return;

      const color = this.densityToColor(density);
      seg.baseColor.copy(color);

      const mat = seg.mesh.material as THREE.MeshStandardMaterial;
      if (seg.isHighlighted) {
        const highlightColor = color.clone();
        highlightColor.offsetHSL(0, 0, 0.3);
        mat.color.copy(highlightColor);
      } else {
        mat.color.copy(color);
      }
    });

    this.updateLODColors();
  }

  private densityToColor(density: number): THREE.Color {
    const t = Math.max(0, Math.min(200, density)) / 200;
    const color = new THREE.Color();

    if (t <= 0.5) {
      const localT = t / 0.5;
      color.copy(COLOR_GREEN).lerp(COLOR_YELLOW, localT);
    } else {
      const localT = (t - 0.5) / 0.5;
      color.copy(COLOR_YELLOW).lerp(COLOR_RED, localT);
    }

    return color;
  }

  setSegmentHighlight(segmentId: string, highlight: boolean): void {
    const seg = this.segments.get(segmentId);
    if (!seg) return;

    seg.isHighlighted = highlight;
    const mat = seg.mesh.material as THREE.MeshStandardMaterial;

    if (highlight) {
      const highlightColor = seg.baseColor.clone();
      highlightColor.offsetHSL(0, 0, 0.3);
      mat.color.copy(highlightColor);

      if (!seg.highlightMesh) {
        const edges = new THREE.EdgesGeometry(seg.mesh.geometry);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          linewidth: 1,
          transparent: true,
          opacity: 0.9,
        });
        seg.highlightMesh = new THREE.LineSegments(edges, lineMat);
        seg.highlightMesh.position.copy(seg.mesh.position);
        seg.lodGroup.add(seg.highlightMesh);
      }
    } else {
      mat.color.copy(seg.baseColor);

      if (seg.highlightMesh) {
        seg.lodGroup.remove(seg.highlightMesh);
        seg.highlightMesh.geometry.dispose();
        (seg.highlightMesh.material as THREE.Material).dispose();
        seg.highlightMesh = null;
      }
    }
  }

  updateLOD(cameraDistance: number): void {
    let newLod: number;

    if (cameraDistance < 40) {
      newLod = 0;
    } else if (cameraDistance < 80) {
      newLod = 1;
    } else {
      newLod = 2;
    }

    if (newLod === this.lodLevel) return;
    this.lodLevel = newLod;

    this.roadGroup.visible = newLod === 0;
    this.gridLinesGroup.visible = newLod === 0;
    this.intersectionGroup.visible = newLod <= 1;
    this.lodMidGroup.visible = newLod === 1;
    this.lodLowGroup.visible = newLod === 2;
  }

  private updateLODColors(): void {
    if (this.lodLevel === 1) {
      const mesh = this.lodMidGroup.children[0] as THREE.Mesh;
      if (mesh) {
        const colorAttr = mesh.geometry.getAttribute('color');
        if (colorAttr) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          const avgColor = this.getAverageColor();
          mat.color.copy(avgColor);
        }
      }
    }

    if (this.lodLevel === 2) {
      this.lodLowGroup.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const row = mesh.userData['intersectionRow'] as number;
        const col = mesh.userData['intersectionCol'] as number;

        let totalDensity = 0;
        let count = 0;

        const neighbors = [
          `h_${row}_${col}`,
          `h_${row}_${col - 1}`,
          `v_${row}_${col}`,
          `v_${row - 1}_${col}`,
        ];

        for (const nid of neighbors) {
          const seg = this.segments.get(nid);
          if (seg) {
            const c = seg.baseColor;
            totalDensity += (c.r + c.g + c.b);
            count++;
          }
        }

        if (count > 0) {
          let r = 0, g = 0, b = 0;
          for (const nid of neighbors) {
            const seg = this.segments.get(nid);
            if (seg) {
              r += seg.baseColor.r;
              g += seg.baseColor.g;
              b += seg.baseColor.b;
            }
          }
          mat.color.setRGB(r / count, g / count, b / count);
        }
      });
    }
  }

  private getAverageColor(): THREE.Color {
    const avg = new THREE.Color(0, 0, 0);
    let count = 0;
    this.segments.forEach((seg) => {
      avg.r += seg.baseColor.r;
      avg.g += seg.baseColor.g;
      avg.b += seg.baseColor.b;
      count++;
    });
    if (count > 0) {
      avg.r /= count;
      avg.g /= count;
      avg.b /= count;
    }
    return avg;
  }
}
