import * as THREE from 'three';

export interface TectonicParams {
  compression: number;
  stretch: number;
  shearAngle: number;
}

const GRID_SIZE = 100;
const TERRAIN_SIZE = 50;
const TRANSITION_DURATION = 1.5;
const VERTEX_COUNT = (GRID_SIZE + 1) * (GRID_SIZE + 1);

const COLOR_DEEP_VALLEY = new THREE.Color('#1B5E20');
const COLOR_PLAIN = new THREE.Color('#66BB6A');
const COLOR_HILL = new THREE.Color('#8D6E63');
const COLOR_MOUNTAIN = new THREE.Color('#8D6E63');
const COLOR_SNOW = new THREE.Color('#ECEFF1');

interface HeightLevel {
  threshold: number;
  low: THREE.Color;
  high: THREE.Color;
}

const HEIGHT_LEVELS: HeightLevel[] = [
  { threshold: -1, low: COLOR_DEEP_VALLEY, high: COLOR_PLAIN },
  { threshold: 1, low: COLOR_PLAIN, high: COLOR_HILL },
  { threshold: 3, low: COLOR_MOUNTAIN, high: COLOR_SNOW }
];

const BLEND_WIDTH = 0.5;
const HALF_BLEND = BLEND_WIDTH / 2;

export class TerrainManager {
  public mesh: THREE.Mesh;
  public wireframe: THREE.LineSegments;
  public ridgeLine: THREE.Line;
  public faultLines: THREE.Line;
  public shearPlane: THREE.Mesh;

  private geometry: THREE.PlaneGeometry;

  private basePositions: Float32Array;
  private targetPositions: Float32Array;
  private startPositions: Float32Array;
  private currentPositions: Float32Array;
  private targetColors: Float32Array;
  private startColors: Float32Array;
  private currentColors: Float32Array;
  private targetHeight: Float32Array;
  private baseHeight: Float32Array;

  private needRecomputeTarget: boolean = true;

  private currentParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };
  private targetParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };
  private transitionProgress: number = 1;
  private transitionStartParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };

  private tmpColor: THREE.Color = new THREE.Color();
  private tmpColorA: THREE.Color = new THREE.Color();
  private tmpColorB: THREE.Color = new THREE.Color();

  constructor() {
    this.geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID_SIZE, GRID_SIZE);
    this.geometry.rotateX(-Math.PI / 2);

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setUsage(THREE.DynamicDrawUsage);
    this.currentPositions = posAttr.array as Float32Array;

    this.basePositions = new Float32Array(this.currentPositions);
    this.targetPositions = new Float32Array(VERTEX_COUNT * 3);
    this.startPositions = new Float32Array(VERTEX_COUNT * 3);

    const colorAttr = new THREE.BufferAttribute(new Float32Array(VERTEX_COUNT * 3), 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('color', colorAttr);
    this.currentColors = colorAttr.array as Float32Array;
    this.targetColors = new Float32Array(VERTEX_COUNT * 3);
    this.startColors = new Float32Array(VERTEX_COUNT * 3);

    this.targetHeight = new Float32Array(VERTEX_COUNT);
    this.baseHeight = new Float32Array(VERTEX_COUNT);

    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: false,
        metalness: 0.05,
        roughness: 0.85,
        side: THREE.DoubleSide
      })
    );

    const wireGeo = new THREE.WireframeGeometry(this.geometry);
    (wireGeo.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.wireframe = new THREE.LineSegments(
      wireGeo,
      new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.35 })
    );

    this.ridgeLine = this.createRidgeLine();
    this.faultLines = this.createFaultLines();
    this.shearPlane = this.createShearPlane();

    this.computeBaseAndApply();
    this.updateDecorations();
  }

  private createRidgeLine(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const x = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * i) / segments;
      points.push(new THREE.Vector3(x, 0, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    (geo.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const mat = new THREE.LineBasicMaterial({
      color: 0xE53935,
      transparent: true,
      opacity: 0.7
    });
    return new THREE.Line(geo, mat);
  }

  private createFaultLines(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    for (let i = 0; i <= segments; i++) {
      const x = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * i) / segments;
      points.push(new THREE.Vector3(x, 0, -TERRAIN_SIZE * 0.2));
    }
    for (let i = 0; i <= segments; i++) {
      const x = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * i) / segments;
      points.push(new THREE.Vector3(x, 0, TERRAIN_SIZE * 0.2));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    (geo.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const mat = new THREE.LineDashedMaterial({
      color: 0xFDD835,
      transparent: true,
      opacity: 0.8,
      dashSize: 0.6,
      gapSize: 0.35
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }

  private createShearPlane(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x1E88E5,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    return plane;
  }

  public setParams(params: Partial<TectonicParams>): void {
    const newTarget = { ...this.targetParams, ...params };
    if (
      newTarget.compression !== this.targetParams.compression ||
      newTarget.stretch !== this.targetParams.stretch ||
      newTarget.shearAngle !== this.targetParams.shearAngle
    ) {
      this.transitionStartParams = { ...this.currentParams };
      this.targetParams = newTarget;
      this.transitionProgress = 0;
      this.needRecomputeTarget = true;

      this.startPositions.set(this.currentPositions);
      this.startColors.set(this.currentColors);
    }
  }

  private computeBase(): void {
    const { compression, stretch, shearAngle } = this.targetParams;
    const shearRad = (shearAngle * Math.PI) / 180;
    const shearAmount = Math.sin(shearRad) * 2;
    const halfSize = TERRAIN_SIZE / 2;

    for (let vi = 0; vi < VERTEX_COUNT; vi++) {
      const bi = vi * 3;
      const baseZ = this.basePositions[bi + 2];
      const normalizedZ = Math.abs(baseZ) / halfSize;

      let height = 0;

      if (compression > 0) {
        const peakHeight = compression * 0.5;
        const mountain = peakHeight * Math.exp(-normalizedZ * normalizedZ * 4);
        const valley = -compression * 0.15 * (1 - Math.exp(-normalizedZ * normalizedZ * 0.5));
        height += mountain + valley;
      }

      if (stretch > 0) {
        const grabenDepth = -stretch * 0.6 * Math.exp(-normalizedZ * normalizedZ * 8);
        const shoulder = stretch * 0.2 * Math.exp(-Math.pow(normalizedZ - 0.5, 2) * 12);
        height += grabenDepth + shoulder;
      }

      this.baseHeight[vi] = height;
    }

    const shearSmoothing = 0.08;

    for (let vi = 0; vi < VERTEX_COUNT; vi++) {
      const bi = vi * 3;
      const baseX = this.basePositions[bi];
      const baseZ = this.basePositions[bi + 2];
      const height = this.baseHeight[vi];

      let shearOffsetX = 0;
      if (shearAngle > 0) {
        const smoothFactor = 1 - Math.exp(-Math.abs(baseZ) * shearSmoothing);
        const sideFactor = baseZ >= 0 ? 1 : -1;
        shearOffsetX = sideFactor * shearAmount * smoothFactor;
      }

      this.targetPositions[bi] = baseX + shearOffsetX;
      this.targetPositions[bi + 1] = height;
      this.targetPositions[bi + 2] = baseZ;
      this.targetHeight[vi] = height;

      this.getColorForHeight(height, this.tmpColor);
      this.targetColors[bi] = this.tmpColor.r;
      this.targetColors[bi + 1] = this.tmpColor.g;
      this.targetColors[bi + 2] = this.tmpColor.b;
    }

    this.repairShearBoundary();
  }

  private repairShearBoundary(): void {
    const { shearAngle } = this.targetParams;
    if (shearAngle <= 0) return;

    const halfSize = TERRAIN_SIZE / 2;
    const rows = GRID_SIZE + 1;
    const shearTolerance = (TERRAIN_SIZE / GRID_SIZE) * 0.6;

    for (let row = 0; row < rows; row++) {
      const z = -halfSize + (row * TERRAIN_SIZE) / GRID_SIZE;
      if (Math.abs(z) <= shearTolerance) {
        for (let col = 0; col <= GRID_SIZE; col++) {
          const idxNeg = (row * rows + col) * 3;
          const idxPos = ((row + 1) * rows + col) * 3;

          const hNeg = this.targetHeight[row * rows + col];
          const hPos = this.targetHeight[(row + 1) * rows + col];
          const avgH = (hNeg + hPos) * 0.5;

          this.targetPositions[idxNeg + 1] = avgH;
          this.targetPositions[idxPos + 1] = avgH;

          this.getColorForHeight(avgH, this.tmpColor);
          this.targetColors[idxNeg] = this.tmpColor.r;
          this.targetColors[idxNeg + 1] = this.tmpColor.g;
          this.targetColors[idxNeg + 2] = this.tmpColor.b;
          this.targetColors[idxPos] = this.tmpColor.r;
          this.targetColors[idxPos + 1] = this.tmpColor.g;
          this.targetColors[idxPos + 2] = this.tmpColor.b;
        }
      }
    }
  }

  private computeBaseAndApply(): void {
    this.computeBase();
    this.currentPositions.set(this.targetPositions);
    this.currentColors.set(this.targetColors);

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.syncWireframe();
  }

  private getColorForHeight(height: number, out: THREE.Color): void {
    let levelIndex = 0;
    for (let i = 0; i < HEIGHT_LEVELS.length; i++) {
      if (height <= HEIGHT_LEVELS[i].threshold) {
        levelIndex = i;
        break;
      }
      levelIndex = i + 1;
    }

    if (levelIndex === 0) {
      if (height < HEIGHT_LEVELS[0].threshold - HALF_BLEND) {
        out.copy(HEIGHT_LEVELS[0].low);
      } else {
        const t = (height - (HEIGHT_LEVELS[0].threshold - HALF_BLEND)) / BLEND_WIDTH;
        this.tmpColorA.copy(HEIGHT_LEVELS[0].low);
        this.tmpColorB.copy(HEIGHT_LEVELS[0].high);
        out.copy(this.tmpColorA).lerp(this.tmpColorB, Math.max(0, Math.min(1, t)));
      }
    } else if (levelIndex === HEIGHT_LEVELS.length) {
      const last = HEIGHT_LEVELS[HEIGHT_LEVELS.length - 1];
      if (height > last.threshold + HALF_BLEND) {
        out.copy(last.high);
      } else {
        const t = (height - (last.threshold - HALF_BLEND)) / BLEND_WIDTH;
        this.tmpColorA.copy(last.low);
        this.tmpColorB.copy(last.high);
        out.copy(this.tmpColorA).lerp(this.tmpColorB, Math.max(0, Math.min(1, t)));
      }
    } else {
      const below = HEIGHT_LEVELS[levelIndex - 1];
      const above = HEIGHT_LEVELS[levelIndex];
      const mid = (below.threshold + above.threshold) / 2;
      if (height <= mid) {
        const t = (height - (below.threshold - HALF_BLEND)) / BLEND_WIDTH;
        this.tmpColorA.copy(below.low);
        this.tmpColorB.copy(below.high);
        out.copy(this.tmpColorA).lerp(this.tmpColorB, Math.max(0, Math.min(1, t)));
      } else {
        const t = (height - (above.threshold - HALF_BLEND)) / BLEND_WIDTH;
        this.tmpColorA.copy(above.low);
        this.tmpColorB.copy(above.high);
        out.copy(this.tmpColorA).lerp(this.tmpColorB, Math.max(0, Math.min(1, t)));
      }
    }
  }

  public update(deltaTime: number): void {
    if (this.needRecomputeTarget) {
      this.computeBase();
      this.needRecomputeTarget = false;
    }

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / TRANSITION_DURATION);
      const t = this.easeInOut(this.transitionProgress);

      this.currentParams.compression = this.lerp(
        this.transitionStartParams.compression,
        this.targetParams.compression,
        t
      );
      this.currentParams.stretch = this.lerp(
        this.transitionStartParams.stretch,
        this.targetParams.stretch,
        t
      );
      this.currentParams.shearAngle = this.lerp(
        this.transitionStartParams.shearAngle,
        this.targetParams.shearAngle,
        t
      );

      this.interpolateBuffers(t);
      this.updateDecorations();
    }
  }

  private interpolateBuffers(t: number): void {
    const total = VERTEX_COUNT * 3;
    const cp = this.currentPositions;
    const sp = this.startPositions;
    const tp = this.targetPositions;
    const cc = this.currentColors;
    const sc = this.startColors;
    const tc = this.targetColors;

    for (let i = 0; i < total; i++) {
      cp[i] = sp[i] + (tp[i] - sp[i]) * t;
      cc[i] = sc[i] + (tc[i] - sc[i]) * t;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.syncWireframe();
  }

  private syncWireframe(): void {
    const wireAttr = this.wireframe.geometry.getAttribute('position') as THREE.BufferAttribute;
    const wireArr = wireAttr.array as Float32Array;
    wireArr.set(this.currentPositions);
    wireAttr.needsUpdate = true;
  }

  private updateDecorations(): void {
    const { compression, stretch, shearAngle } = this.currentParams;
    const shearRad = (shearAngle * Math.PI) / 180;
    const shearAmount = Math.sin(shearRad) * 2;
    const halfSize = TERRAIN_SIZE / 2;

    if (compression > 0.01) {
      this.ridgeLine.visible = true;
      (this.ridgeLine.material as THREE.LineBasicMaterial).opacity = Math.min(0.75, compression * 0.08 + 0.1);
      this.updateRidgeLine(compression, shearAngle, shearAmount, halfSize);
    } else {
      this.ridgeLine.visible = false;
    }

    if (stretch > 0.01) {
      this.faultLines.visible = true;
      (this.faultLines.material as THREE.LineDashedMaterial).opacity = Math.min(0.85, stretch * 0.15 + 0.1);
      this.updateFaultLines(compression, stretch, shearAngle, shearAmount, halfSize);
    } else {
      this.faultLines.visible = false;
    }

    if (shearAngle > 0.01) {
      this.shearPlane.visible = true;
      const avgHeight = compression * 0.25 - stretch * 0.2;
      this.shearPlane.position.set(0, avgHeight, 0);
      const opacity = Math.min(0.35, shearAngle * 0.002 + 0.05);
      (this.shearPlane.material as THREE.MeshBasicMaterial).opacity = opacity;
    } else {
      this.shearPlane.visible = false;
    }
  }

  private updateRidgeLine(compression: number, shearAngle: number, shearAmount: number, halfSize: number): void {
    const posAttr = this.ridgeLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const peakHeight = compression * 0.5 * 0.98;
    const shearSmoothing = 0.08;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] = peakHeight;
      const z = positions[i + 2];
      const baseX = -halfSize + (halfSize * 2 * (i / 3)) / 200;
      if (shearAngle > 0) {
        const smoothFactor = 1 - Math.exp(-Math.abs(z) * shearSmoothing);
        const sideFactor = z >= 0 ? 1 : -1;
        positions[i] = baseX + sideFactor * shearAmount * smoothFactor;
      } else {
        positions[i] = baseX;
      }
    }

    posAttr.needsUpdate = true;
  }

  private updateFaultLines(compression: number, stretch: number, shearAngle: number, shearAmount: number, halfSize: number): void {
    const posAttr = this.faultLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const shearSmoothing = 0.08;

    for (let i = 0; i < positions.length; i += 3) {
      const z = positions[i + 2];
      const normalizedZ = Math.abs(z) / halfSize;

      let height = 0;
      if (compression > 0) {
        const peakHeight = compression * 0.5;
        const mountain = peakHeight * Math.exp(-normalizedZ * normalizedZ * 4);
        const valley = -compression * 0.15 * (1 - Math.exp(-normalizedZ * normalizedZ * 0.5));
        height += mountain + valley;
      }
      if (stretch > 0) {
        const graben = -stretch * 0.6 * Math.exp(-normalizedZ * normalizedZ * 8);
        const shoulder = stretch * 0.2 * Math.exp(-Math.pow(normalizedZ - 0.5, 2) * 12);
        height += graben + shoulder;
      }

      positions[i + 1] = height + 0.05;

      const segIdx = Math.floor((i / 3) % 201);
      const baseX = -halfSize + (halfSize * 2 * segIdx) / 200;
      if (shearAngle > 0) {
        const smoothFactor = 1 - Math.exp(-Math.abs(z) * shearSmoothing);
        const sideFactor = z >= 0 ? 1 : -1;
        positions[i] = baseX + sideFactor * shearAmount * smoothFactor;
      } else {
        positions[i] = baseX;
      }
    }

    posAttr.needsUpdate = true;
    this.faultLines.computeLineDistances();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public getCurrentParams(): TectonicParams {
    return { ...this.currentParams };
  }
}
