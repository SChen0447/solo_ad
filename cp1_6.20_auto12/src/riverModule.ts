import * as THREE from 'three';
import { DataPoint, MetricKey, METRICS, DataModule } from './dataModule';

export interface RiverOptions {
  widthMetric: MetricKey;
  colorMetric: MetricKey;
  tubeLength: number;
  maxWidth: number;
  minWidth: number;
  radialSegments: number;
}

export interface HighlightInfo {
  dayIndex: number;
  position: THREE.Vector3;
}

const DEFAULT_OPTIONS: RiverOptions = {
  widthMetric: 'precipitation',
  colorMetric: 'temperature',
  tubeLength: 200,
  maxWidth: 8,
  minWidth: 0.5,
  radialSegments: 16
};

export class RiverModule {
  private scene: THREE.Scene;
  private dataModule: DataModule;
  private options: RiverOptions;

  private riverGroup: THREE.Group;
  private glowGroup: THREE.Group;
  private highlightRing: THREE.Mesh;
  private pathCurve: THREE.CatmullRomCurve3;

  private allData: DataPoint[];
  private pointsPositions: THREE.Vector3[] = [];

  private visibleMetrics: Set<MetricKey> = new Set(METRICS.map(m => m.key));
  private currentHighlightDay: number = -1;
  private dayMeshes: Map<number, THREE.Mesh> = new Map();

  private tempColor = new THREE.Color();

  constructor(scene: THREE.Scene, dataModule: DataModule, options?: Partial<RiverOptions>) {
    this.scene = scene;
    this.dataModule = dataModule;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.riverGroup = new THREE.Group();
    this.glowGroup = new THREE.Group();
    this.scene.add(this.riverGroup);
    this.scene.add(this.glowGroup);

    this.allData = this.dataModule.getAllData();
    this.pathCurve = this.createPathCurve();
    this.pointsPositions = this.computePointPositions();

    this.highlightRing = this.createHighlightRing();
    this.highlightRing.visible = false;
    this.scene.add(this.highlightRing);

    this.buildRiver();
  }

  private createPathCurve(): THREE.CatmullRomCurve3 {
    const points: THREE.Vector3[] = [];
    const dayCount = this.allData.length;
    const length = this.options.tubeLength;

    for (let i = 0; i <= dayCount; i++) {
      const t = i / dayCount;
      const z = -t * length;
      const x = Math.sin(t * Math.PI * 4) * 20 + Math.sin(t * Math.PI * 2) * 10;
      const y = Math.sin(t * Math.PI * 3) * 8 + Math.cos(t * Math.PI * 6) * 3;
      points.push(new THREE.Vector3(x, y, z));
    }

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }

  private computePointPositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const dayCount = this.allData.length;
    for (let i = 0; i < dayCount; i++) {
      const t = (i + 0.5) / dayCount;
      positions.push(this.pathCurve.getPointAt(t));
    }
    return positions;
  }

  private createHighlightRing(): THREE.Mesh {
    const geometry = new THREE.TorusGeometry(1.5, 0.15, 16, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  private getCoolWarmGradient(t: number): THREE.Color {
    const clampedT = Math.max(0, Math.min(1, t));
    const cool = new THREE.Color(0x0066ff);
    const mid = new THREE.Color(0x8844ff);
    const warm = new THREE.Color(0xff4466);
    if (clampedT < 0.5) {
      return cool.clone().lerp(mid, clampedT * 2);
    } else {
      return mid.clone().lerp(warm, (clampedT - 0.5) * 2);
    }
  }

  private getWidthForDay(dayIndex: number): number {
    if (this.visibleMetrics.size === 0) return this.options.minWidth;

    let totalWidth = 0;
    const visibleArray = Array.from(this.visibleMetrics);

    for (const metric of visibleArray) {
      const dataPoint = this.allData[dayIndex];
      const value = dataPoint[metric];
      const range = this.dataModule.getMetricRange(metric);
      const normalized = this.normalize(value, range.min, range.max);
      const segmentWidth = this.options.minWidth + normalized * (this.options.maxWidth / visibleArray.length);
      totalWidth += segmentWidth;
    }

    return Math.max(this.options.minWidth, totalWidth);
  }

  private buildRiver(): void {
    this.riverGroup.clear();
    this.glowGroup.clear();
    this.dayMeshes.clear();

    const dayCount = this.allData.length;
    const segmentsPerDay = 2;
    const tubularSegments = dayCount * segmentsPerDay;

    const tubePoints: THREE.Vector3[] = [];
    const radii: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      tubePoints.push(this.pathCurve.getPointAt(t));

      const dayIdx = Math.min(dayCount - 1, Math.floor(t * dayCount));
      const width = this.getWidthForDay(dayIdx);
      radii.push(width / 2);

      const colorMetric = this.options.colorMetric;
      const value = this.allData[dayIdx][colorMetric];
      const range = this.dataModule.getMetricRange(colorMetric);
      const normalized = this.normalize(value, range.min, range.max);
      const color = this.getCoolWarmGradient(normalized);
      colors.push(color.getHex());
    }

    const geometry = this.createVariableTubeGeometry(tubePoints, radii, colors, this.options.radialSegments);

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      shininess: 80,
      specular: 0x00d4ff,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'river';
    this.riverGroup.add(mesh);

    const glowMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      depthWrite: false
    });

    const glowGeometry = geometry.clone();
    const glowPositions = glowGeometry.attributes.position;
    const glowNormals = glowGeometry.attributes.normal;

    for (let i = 0; i < glowPositions.count; i++) {
      const nx = glowNormals.getX(i);
      const ny = glowNormals.getY(i);
      const nz = glowNormals.getZ(i);
      const scale = 2.5;
      glowPositions.setX(i, glowPositions.getX(i) + nx * scale);
      glowPositions.setY(i, glowPositions.getY(i) + ny * scale);
      glowPositions.setZ(i, glowPositions.getZ(i) + nz * scale);
    }
    glowPositions.needsUpdate = true;

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowGroup.add(glowMesh);

    this.createPickableSegments();
  }

  private createVariableTubeGeometry(
    points: THREE.Vector3[],
    radii: number[],
    colors: number[],
    radialSegments: number
  ): THREE.BufferGeometry {
    const frames = this.computeFrenetFrames(points, true);
    const tangents = frames.tangents;
    const normals = frames.normals;
    const binormals = frames.binormals;

    const tubularSegments = points.length - 1;
    const vertexCount = (tubularSegments + 1) * (radialSegments + 1);
    const indexCount = tubularSegments * radialSegments * 6;

    const positions = new Float32Array(vertexCount * 3);
    const normalsArr = new Float32Array(vertexCount * 3);
    const colorsArr = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(indexCount);

    let idx = 0;
    let colorHelper = new THREE.Color();

    for (let i = 0; i <= tubularSegments; i++) {
      const P = points[i];
      const N = normals[i];
      const B = binormals[i];
      const radius = radii[i];
      colorHelper.setHex(colors[i]);

      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = Math.cos(v);

        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;

        positions[idx * 3] = P.x + radius * nx;
        positions[idx * 3 + 1] = P.y + radius * ny;
        positions[idx * 3 + 2] = P.z + radius * nz;

        normalsArr[idx * 3] = nx;
        normalsArr[idx * 3 + 1] = ny;
        normalsArr[idx * 3 + 2] = nz;

        colorsArr[idx * 3] = colorHelper.r;
        colorsArr[idx * 3 + 1] = colorHelper.g;
        colorsArr[idx * 3 + 2] = colorHelper.b;

        uvs[idx * 2] = i / tubularSegments;
        uvs[idx * 2 + 1] = j / radialSegments;

        idx++;
      }
    }

    let index = 0;
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = a + radialSegments + 1;
        const c = a + 1;
        const d = b + 1;

        indices[index++] = a;
        indices[index++] = b;
        indices[index++] = c;
        indices[index++] = b;
        indices[index++] = d;
        indices[index++] = c;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normalsArr, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    return geometry;
  }

  private computeFrenetFrames(points: THREE.Vector3[], closed: boolean) {
    const tangents: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    const binormals: THREE.Vector3[] = [];

    const segments = points.length - 1;

    for (let i = 0; i <= segments; i++) {
      let tangent: THREE.Vector3;
      if (i < segments) {
        tangent = points[i + 1].clone().sub(points[i]).normalize();
      } else {
        tangent = points[i].clone().sub(points[i - 1]).normalize();
      }
      tangents.push(tangent);
    }

    let normal = new THREE.Vector3();
    let binormal = new THREE.Vector3();
    const min = Number.MAX_VALUE;
    const tx = Math.abs(tangents[0].x);
    const ty = Math.abs(tangents[0].y);
    const tz = Math.abs(tangents[0].z);

    if (tx < ty && tx < tz) {
      normal.set(0, 1, 0);
    } else if (ty < tz) {
      normal.set(1, 0, 0);
    } else {
      normal.set(0, 0, 1);
    }

    const vec = new THREE.Vector3();
    vec.crossVectors(tangents[0], normal).normalize();
    normal.crossVectors(tangents[0], vec);
    binormal.crossVectors(tangents[0], normal);

    normals.push(normal.clone());
    binormals.push(binormal.clone());

    for (let i = 1; i <= segments; i++) {
      const prevNormal = normals[i - 1].clone();
      const prevBinormal = binormals[i - 1].clone();
      const prevTangent = tangents[i - 1];
      const tangent = tangents[i];

      const axis = new THREE.Vector3();
      let rotation: number;

      if (prevTangent && tangent) {
        axis.crossVectors(prevTangent, tangent).normalize();
        rotation = Math.acos(Math.min(1, prevTangent.dot(tangent)));
      } else {
        rotation = 0;
      }

      if (rotation > Number.EPSILON) {
        prevNormal.applyAxisAngle(axis, rotation);
      }

      normals.push(prevNormal);
      const newBinormal = new THREE.Vector3().crossVectors(tangent, prevNormal).normalize();
      binormals.push(newBinormal);
    }

    if (closed) {
      const startNormal = normals[0].clone();
      const endNormal = normals[segments].clone();
      const dot = Math.min(1, startNormal.dot(endNormal));
      let theta = Math.acos(dot) / segments;
      const tangent = tangents[segments];

      if (tangent.dot(new THREE.Vector3().crossVectors(startNormal, endNormal)) > 0) {
        theta = -theta;
      }

      for (let i = 1; i <= segments; i++) {
        normals[i].applyAxisAngle(tangents[i], theta * i);
        binormals[i].crossVectors(tangents[i], normals[i]);
      }
    }

    return { tangents, normals, binormals };
  }

  private createPickableSegments(): void {
    const dayCount = this.allData.length;
    const segmentsPerMesh = 10;

    for (let start = 0; start < dayCount; start += segmentsPerMesh) {
      const end = Math.min(dayCount, start + segmentsPerMesh);
      const segmentPoints: THREE.Vector3[] = [];
      const dayIndices: number[] = [];

      for (let i = start; i < end; i++) {
        const t = (i + 0.5) / dayCount;
        segmentPoints.push(this.pathCurve.getPointAt(t));
        dayIndices.push(i);
      }

      if (segmentPoints.length < 2) continue;

      const curve = new THREE.CatmullRomCurve3(segmentPoints, false, 'catmullrom', 0.5);
      const geometry = new THREE.TubeGeometry(curve, segmentPoints.length * 3, 4, 8, false);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'river-pickable';
      (mesh as any).dayIndices = dayIndices;
      (mesh as any).startDay = start;
      (mesh as any).endDay = end;
      this.riverGroup.add(mesh);
    }
  }

  getDayPosition(dayIndex: number): THREE.Vector3 | null {
    if (dayIndex < 0 || dayIndex >= this.pointsPositions.length) return null;
    return this.pointsPositions[dayIndex].clone();
  }

  findNearestDay(worldPoint: THREE.Vector3): number {
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < this.pointsPositions.length; i++) {
      const dist = this.pointsPositions[i].distanceTo(worldPoint);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    return nearest;
  }

  setHighlight(dayIndex: number): void {
    if (dayIndex < 0 || dayIndex >= this.pointsPositions.length) {
      this.highlightRing.visible = false;
      this.currentHighlightDay = -1;
      return;
    }

    this.currentHighlightDay = dayIndex;
    const pos = this.pointsPositions[dayIndex];
    const t = (dayIndex + 0.5) / this.allData.length;
    const tangent = this.pathCurve.getTangentAt(t).normalize();

    this.highlightRing.visible = true;
    this.highlightRing.position.copy(pos);
    this.highlightRing.lookAt(pos.clone().add(tangent));

    this.setOtherDaysOpacity(dayIndex, 0.3);
  }

  clearHighlight(): void {
    this.highlightRing.visible = false;
    this.currentHighlightDay = -1;
    this.setAllDaysOpacity(0.85);
  }

  private setOtherDaysOpacity(highlightDay: number, opacity: number): void {
    this.riverGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'river') {
        const mat = child.material as THREE.MeshPhongMaterial;
        mat.opacity = 0.85;
      }
    });

    this.glowGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.15;
      }
    });
  }

  private setAllDaysOpacity(opacity: number): void {
    this.riverGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === 'river') {
        const mat = child.material as THREE.MeshPhongMaterial;
        mat.opacity = opacity;
      }
    });

    this.glowGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = opacity * 0.3;
      }
    });
  }

  toggleMetric(metric: MetricKey, visible: boolean): void {
    if (visible) {
      this.visibleMetrics.add(metric);
    } else {
      this.visibleMetrics.delete(metric);
    }
    this.buildRiver();
    if (this.currentHighlightDay >= 0) {
      this.setHighlight(this.currentHighlightDay);
    }
  }

  isMetricVisible(metric: MetricKey): boolean {
    return this.visibleMetrics.has(metric);
  }

  getRiverGroup(): THREE.Group {
    return this.riverGroup;
  }

  setColorMetric(metric: MetricKey): void {
    this.options.colorMetric = metric;
    this.buildRiver();
    if (this.currentHighlightDay >= 0) {
      this.setHighlight(this.currentHighlightDay);
    }
  }

  getOptions(): RiverOptions {
    return { ...this.options };
  }

  update(delta: number): void {
    if (this.highlightRing.visible) {
      const mat = this.highlightRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.7 + Math.sin(performance.now() * 0.005) * 0.2;
    }
  }
}
