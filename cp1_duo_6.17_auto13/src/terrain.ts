import * as THREE from 'three';

export interface TectonicParams {
  compression: number;
  stretch: number;
  shearAngle: number;
}

interface CachedColors {
  deepValley: THREE.Color;
  valley: THREE.Color;
  plain: THREE.Color;
  hill: THREE.Color;
  mountain: THREE.Color;
  snow: THREE.Color;
}

const GRID_SIZE = 100;
const TERRAIN_SIZE = 50;
const TRANSITION_DURATION = 1.5;

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

  private currentParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };
  private targetParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };
  private transitionProgress: number = 1;
  private transitionStartParams: TectonicParams = { compression: 0, stretch: 0, shearAngle: 0 };

  private colors: CachedColors;

  constructor() {
    this.colors = {
      deepValley: new THREE.Color('#0D3D11'),
      valley: new THREE.Color('#1B5E20'),
      plain: new THREE.Color('#66BB6A'),
      hill: new THREE.Color('#8D6E63'),
      mountain: new THREE.Color('#A1887F'),
      snow: new THREE.Color('#ECEFF1')
    };

    this.geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID_SIZE, GRID_SIZE);
    this.geometry.rotateX(-Math.PI / 2);

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.basePositions = new Float32Array(posAttr.array as Float32Array);
    this.targetPositions = new Float32Array(this.basePositions);
    this.startPositions = new Float32Array(this.basePositions);

    const colorAttr = new THREE.BufferAttribute(
      new Float32Array((posAttr.array as Float32Array).length),
      3
    );
    this.geometry.setAttribute('color', colorAttr);

    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: false,
        metalness: 0.1,
        roughness: 0.8,
        side: THREE.DoubleSide
      })
    );

    const wireGeo = new THREE.WireframeGeometry(this.geometry);
    this.wireframe = new THREE.LineSegments(
      wireGeo,
      new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.35 })
    );

    this.ridgeLine = this.createRidgeLine();
    this.faultLines = this.createFaultLines();
    this.shearPlane = this.createShearPlane();

    this.updateColors();
    this.updateDecorations();
  }

  private createRidgeLine(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const x = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * i) / segments;
      points.push(new THREE.Vector3(x, 0, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xE53935,
      transparent: true,
      opacity: 0.7
    });
    return new THREE.Line(geo, mat);
  }

  private createFaultLines(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x1 = -TERRAIN_SIZE / 2 + (TERRAIN_SIZE * 0.25) * t;
      const x2 = TERRAIN_SIZE / 2 - (TERRAIN_SIZE * 0.25) * t;
      points.push(new THREE.Vector3(x1, 0, -TERRAIN_SIZE * 0.2));
      points.push(new THREE.Vector3(x2, 0, TERRAIN_SIZE * 0.2));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xFDD835,
      transparent: true,
      opacity: 0.8,
      dashSize: 0.5,
      gapSize: 0.3
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }

  private createShearPlane(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, 8);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x1E88E5,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    return new THREE.Mesh(geo, mat);
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
      this.computeTargetPositions();
    }
  }

  private computeTargetPositions(): void {
    const pos = this.targetPositions;
    const base = this.basePositions;
    const { compression, stretch, shearAngle } = this.targetParams;
    const shearRad = (shearAngle * Math.PI) / 180;

    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];

      let height = 0;

      if (compression > 0) {
        const normalizedZ = Math.abs(z) / (TERRAIN_SIZE / 2);
        const peakHeight = compression * 0.5;
        const mountain = peakHeight * Math.exp(-normalizedZ * normalizedZ * 4);
        const valley = -compression * 0.15 * (1 - Math.exp(-normalizedZ * normalizedZ * 0.5));
        height += mountain + valley;
      }

      if (stretch > 0) {
        const normalizedZ = Math.abs(z) / (TERRAIN_SIZE / 2);
        const grabenDepth = -stretch * 0.6 * Math.exp(-normalizedZ * normalizedZ * 8);
        const shoulder = stretch * 0.2 * Math.exp(-Math.pow(normalizedZ - 0.5, 2) * 12);
        height += grabenDepth + shoulder;
      }

      pos[i] = x;
      pos[i + 1] = height;
      pos[i + 2] = z;

      if (shearAngle > 0) {
        const shearAmount = Math.sin(shearRad) * 2;
        const sideFactor = z >= 0 ? 1 : -1;
        pos[i] = x + sideFactor * shearAmount * (1 - Math.exp(-Math.abs(z) * 0.1));
      }
    }

    if (this.transitionProgress === 0) {
      this.startPositions.set(this.geometry.getAttribute('position').array as Float32Array);
    }
  }

  public update(deltaTime: number): void {
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

      this.interpolatePositions(t);
      this.updateColors();
      this.updateDecorations();
    }
  }

  private interpolatePositions(t: number): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const start = this.startPositions;
    const target = this.targetPositions;

    for (let i = 0; i < arr.length; i++) {
      arr[i] = this.lerp(start[i], target[i], t);
    }

    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    const wireAttr = (this.wireframe.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    wireAttr.set(arr);
    (this.wireframe.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateColors(): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;
    const tmpColor = new THREE.Color();

    for (let i = 0, j = 0; i < positions.length; i += 3, j += 3) {
      const h = positions[i + 1];
      this.getColorForHeight(h, tmpColor);
      colors[j] = tmpColor.r;
      colors[j + 1] = tmpColor.g;
      colors[j + 2] = tmpColor.b;
    }

    colorAttr.needsUpdate = true;
  }

  private getColorForHeight(height: number, out: THREE.Color): void {
    const { deepValley, valley, plain, hill, mountain, snow } = this.colors;
    const bw = 0.5;

    if (height < -1 - bw) {
      out.copy(deepValley);
    } else if (height < -1) {
      const t = (height + 1 + bw) / bw;
      out.copy(deepValley).lerp(valley, t);
    } else if (height < -1 + bw) {
      const t = (height + 1) / bw;
      out.copy(valley).lerp(plain, t);
    } else if (height < 1 - bw) {
      out.copy(plain);
    } else if (height < 1) {
      const t = (height - 1 + bw) / bw;
      out.copy(plain).lerp(hill, t);
    } else if (height < 1 + bw) {
      const t = (height - 1) / bw;
      out.copy(hill).lerp(hill, t);
    } else if (height < 3 - bw) {
      out.copy(hill);
    } else if (height < 3) {
      const t = (height - 3 + bw) / bw;
      out.copy(hill).lerp(mountain, t);
    } else if (height < 3 + bw) {
      const t = (height - 3) / bw;
      out.copy(mountain).lerp(snow, t);
    } else {
      out.copy(snow);
    }
  }

  private updateDecorations(): void {
    const { compression, stretch, shearAngle } = this.currentParams;

    if (compression > 0.01) {
      this.ridgeLine.visible = true;
      const ridgePos = (this.ridgeLine.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const peakHeight = compression * 0.5;
      for (let i = 0; i < ridgePos.length; i += 3) {
        ridgePos[i + 1] = peakHeight * 0.98;
      }
      (this.ridgeLine.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.ridgeLine.material as THREE.LineBasicMaterial).opacity = Math.min(0.7, compression * 0.1);
    } else {
      this.ridgeLine.visible = false;
    }

    if (stretch > 0.01) {
      this.faultLines.visible = true;
      const faultPos = (this.faultLines.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
      const grabenDepth = -stretch * 0.6;
      for (let i = 0; i < faultPos.length; i += 3) {
        faultPos[i + 1] = grabenDepth * 0.5 + 0.1;
      }
      (this.faultLines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.faultLines.material as THREE.LineDashedMaterial).opacity = Math.min(0.8, stretch * 0.2);
      this.faultLines.computeLineDistances();
    } else {
      this.faultLines.visible = false;
    }

    if (shearAngle > 0.01) {
      this.shearPlane.visible = true;
      const avgHeight = compression * 0.25 - stretch * 0.2;
      this.shearPlane.position.set(0, avgHeight, 0);
      (this.shearPlane.material as THREE.MeshBasicMaterial).opacity = Math.min(0.3, shearAngle * 0.003);
    } else {
      this.shearPlane.visible = false;
    }
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
