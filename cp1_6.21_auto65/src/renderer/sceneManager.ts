import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface GeometryData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array | null;
  vertexCount: number;
  faceCount: number;
}

export interface ModelStats {
  faceCount: number;
  vertexCount: number;
  memoryKB: number;
}

export interface HistoryState {
  id: string;
  geometryData: GeometryData;
  faceCount: number;
  vertexCount: number;
  algorithm: string;
  percent: number;
  elapsedMs: number;
  prevFaceCount: number;
  timestamp: number;
}

export interface SceneManagerOptions {
  container: HTMLElement;
}

type Command =
  | { type: 'SIMPLIFY_REQUEST'; algorithm: 'edge-collapse' | 'vertex-clustering' | 'quadric-collapse'; percent: number; requestId: string }
  | { type: 'SIMPLIFY_COMPLETE'; geometry: GeometryData; requestId: string; elapsedMs: number }
  | { type: 'APPLY_HISTORY'; state: HistoryState }
  | { type: 'RESET' }
  | { type: 'TOGGLE_DIFF_HIGHLIGHT'; enabled: boolean; prevState: HistoryState | null };

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private mesh: THREE.Mesh | null = null;
  private wireframeMesh: THREE.LineSegments | null = null;
  private haloMesh: THREE.Mesh | null = null;
  private diffMesh: THREE.Mesh | null = null;

  private originalGeometryData: GeometryData | null = null;
  private currentGeometryData: GeometryData | null = null;
  private rotateStartTime = performance.now();
  private highlightStartTime = 0;
  private diffHighlightEnabled = false;
  private prevStateForDiff: HistoryState | null = null;

  private clock = new THREE.Clock();
  private lastTime = 0;
  private frameCount = 0;
  private fps = 60;
  private fpsUpdateTime = 0;

  private onStatsChange: ((stats: ModelStats & { fps: number }) => void) | null = null;
  private onCommand: ((cmd: unknown) => void) | null = null;

  constructor(options: SceneManagerOptions) {
    this.container = options.container;

    this.scene = new THREE.Scene();

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.set(0, 2.5, 6);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;

    this.setupLights();
    this.setupDefaultModel();
    this.setupResizeHandler();
    this.startRenderLoop();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404080, 0.5);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 5, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x58a6ff, 0.4);
    fillLight.position.set(-5, 2, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xa371f7, 0.3);
    rimLight.position.set(0, -3, 5);
    this.scene.add(rimLight);
  }

  private geometryToData(geometry: THREE.BufferGeometry): GeometryData {
    const positions = geometry.attributes.position.array as Float32Array;
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    const normalAttr = geometry.attributes.normal as THREE.BufferAttribute | undefined;
    const normals: Float32Array = normalAttr
      ? (normalAttr.array as Float32Array)
      : new Float32Array(geometry.attributes.position.count * 3);

    const indices = geometry.index ? new Uint32Array(geometry.index.array) : null;
    const vertexCount = geometry.attributes.position.count;
    const faceCount = indices ? indices.length / 3 : vertexCount / 3;

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices: indices ? new Uint32Array(indices) : null,
      vertexCount,
      faceCount
    };
  }

  private dataToGeometry(data: GeometryData): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array(data.positions), 3
    ));
    geometry.setAttribute('normal', new THREE.BufferAttribute(
      new Float32Array(data.normals), 3
    ));
    if (data.indices) {
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data.indices), 1));
    }
    return geometry;
  }

  private computeMemoryKB(data: GeometryData): number {
    let bytes = data.positions.byteLength + data.normals.byteLength;
    if (data.indices) bytes += data.indices.byteLength;
    return bytes / 1024;
  }

  private getSimplificationColor(percent: number): THREE.Color {
    const t = 1 - (percent - 1) / 49;
    const clamped = Math.max(0, Math.min(1, t));

    const r1 = 0, g1 = 255, b1 = 255;
    const r2 = 255, g2 = 69, b2 = 0;

    const r = Math.round(r1 + (r2 - r1) * clamped);
    const g = Math.round(g1 + (g2 - g1) * clamped);
    const b = Math.round(b1 + (b2 - b1) * clamped);

    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  private setupDefaultModel(): void {
    const torusKnot = new THREE.TorusKnotGeometry(1, 0.35, 180, 40, 2, 5);

    this.originalGeometryData = this.geometryToData(torusKnot);
    this.currentGeometryData = { ...this.originalGeometryData };

    this.replaceMesh(this.originalGeometryData, 0xffffff);
    torusKnot.dispose();
    this.emitStats();
  }

  private replaceMesh(data: GeometryData, wireframeColor: number | THREE.Color): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      (this.wireframeMesh.material as THREE.Material).dispose();
      this.wireframeMesh = null;
    }
    if (this.haloMesh) {
      this.scene.remove(this.haloMesh);
      this.haloMesh.geometry.dispose();
      (this.haloMesh.material as THREE.Material).dispose();
      this.haloMesh = null;
    }
    if (this.diffMesh) {
      this.scene.remove(this.diffMesh);
      this.diffMesh.geometry.dispose();
      (this.diffMesh.material as THREE.Material).dispose();
      this.diffMesh = null;
    }

    const geometry = this.dataToGeometry(data);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x88aaff,
      metalness: 0.3,
      roughness: 0.5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    const edges = new THREE.EdgesGeometry(geometry, 15);
    const wireColor = wireframeColor instanceof THREE.Color ? wireframeColor.getHex() : wireframeColor;
    const wireMaterial = new THREE.LineBasicMaterial({
      color: wireColor,
      transparent: true,
      opacity: 0.85
    });
    this.wireframeMesh = new THREE.LineSegments(edges, wireMaterial);
    this.scene.add(this.wireframeMesh);

    this.currentGeometryData = data;
  }

  public setHaloVisible(visible: boolean): void {
    if (visible) {
      if (!this.mesh || this.haloMesh) return;
      const haloGeo = this.mesh.geometry.clone();
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x58a6ff,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.2,
        depthWrite: false
      });
      this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
      this.haloMesh.scale.setScalar(1.05);
      this.scene.add(this.haloMesh);
    } else {
      if (this.haloMesh) {
        this.scene.remove(this.haloMesh);
        this.haloMesh.geometry.dispose();
        (this.haloMesh.material as THREE.Material).dispose();
        this.haloMesh = null;
      }
    }
  }

  public getCurrentGeometryData(): GeometryData | null {
    if (!this.currentGeometryData) return null;
    return {
      positions: new Float32Array(this.currentGeometryData.positions),
      normals: new Float32Array(this.currentGeometryData.normals),
      indices: this.currentGeometryData.indices ? new Uint32Array(this.currentGeometryData.indices) : null,
      vertexCount: this.currentGeometryData.vertexCount,
      faceCount: this.currentGeometryData.faceCount
    };
  }

  public getCurrentStats(): ModelStats & { fps: number } {
    const data = this.currentGeometryData ?? this.originalGeometryData;
    if (!data) return { faceCount: 0, vertexCount: 0, memoryKB: 0, fps: this.fps };
    return {
      faceCount: data.faceCount,
      vertexCount: data.vertexCount,
      memoryKB: this.computeMemoryKB(data),
      fps: this.fps
    };
  }

  public setOnStatsChange(cb: (stats: ModelStats & { fps: number }) => void): void {
    this.onStatsChange = cb;
  }

  public setOnCommand(cb: (cmd: unknown) => void): void {
    this.onCommand = cb;
  }

  private emitStats(): void {
    if (this.onStatsChange) {
      this.onStatsChange(this.getCurrentStats());
    }
  }

  public processCommand(cmd: Command): void {
    switch (cmd.type) {
      case 'SIMPLIFY_REQUEST':
        this.setHaloVisible(true);
        break;

      case 'SIMPLIFY_COMPLETE': {
        this.setHaloVisible(false);
        const color = 0xffffff;
        this.replaceMesh(cmd.geometry, color);
        this.rotateStartTime = performance.now();
        setTimeout(() => this.emitStats(), 50);
        break;
      }

      case 'APPLY_HISTORY': {
        const color = this.getSimplificationColor(cmd.state.percent);
        this.replaceMesh(cmd.state.geometryData, color);
        setTimeout(() => this.emitStats(), 50);
        break;
      }

      case 'RESET': {
        if (this.originalGeometryData) {
          this.replaceMesh(this.originalGeometryData, 0xffffff);
          this.diffHighlightEnabled = false;
          this.prevStateForDiff = null;
          this.removeDiffMesh();
          setTimeout(() => this.emitStats(), 50);
        }
        break;
      }

      case 'TOGGLE_DIFF_HIGHLIGHT': {
        this.diffHighlightEnabled = cmd.enabled;
        this.prevStateForDiff = cmd.prevState;
        if (cmd.enabled && cmd.prevState) {
          this.computeAndShowDiff(cmd.prevState);
        } else {
          this.removeDiffMesh();
        }
        break;
      }
    }
  }

  private computeFaceNormals(data: GeometryData): Array<[number, number, number]> {
    const normals: Array<[number, number, number]> = [];
    const faceCount = data.faceCount;
    for (let fi = 0; fi < faceCount; fi++) {
      let ia, ib, ic;
      if (data.indices) {
        ia = data.indices[fi * 3];
        ib = data.indices[fi * 3 + 1];
        ic = data.indices[fi * 3 + 2];
      } else {
        ia = fi * 3;
        ib = fi * 3 + 1;
        ic = fi * 3 + 2;
      }

      const ax = data.positions[ia * 3], ay = data.positions[ia * 3 + 1], az = data.positions[ia * 3 + 2];
      const bx = data.positions[ib * 3], by = data.positions[ib * 3 + 1], bz = data.positions[ib * 3 + 2];
      const cx = data.positions[ic * 3], cy = data.positions[ic * 3 + 1], cz = data.positions[ic * 3 + 2];

      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cz - az;

      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= len; ny /= len; nz /= len;
      normals.push([nx, ny, nz]);
    }
    return normals;
  }

  private computeAndShowDiff(prevState: HistoryState): void {
    this.removeDiffMesh();
    if (!this.currentGeometryData || !this.mesh) return;

    const prevData = prevState.geometryData;
    const currData = this.currentGeometryData;

    const prevNormals = this.computeFaceNormals(prevData);
    const currNormals = this.computeFaceNormals(currData);

    const sharedFaces = Math.min(prevNormals.length, currNormals.length);
    const diffFaceIndices: number[] = [];

    const thresholdCos = Math.cos(30 * Math.PI / 180);

    for (let fi = 0; fi < sharedFaces; fi++) {
      const [pnx, pny, pnz] = prevNormals[fi];
      const [cnx, cny, cnz] = currNormals[fi];
      const dot = Math.abs(pnx * cnx + pny * cny + pnz * cnz);
      if (dot < thresholdCos) {
        diffFaceIndices.push(fi);
      }
    }

    if (diffFaceIndices.length === 0) return;

    const diffPositions: number[] = [];
    const diffIndices: number[] = [];
    const diffNormals: number[] = [];
    let vIdx = 0;

    for (const fi of diffFaceIndices) {
      let ia, ib, ic;
      if (currData.indices) {
        ia = currData.indices[fi * 3];
        ib = currData.indices[fi * 3 + 1];
        ic = currData.indices[fi * 3 + 2];
      } else {
        ia = fi * 3;
        ib = fi * 3 + 1;
        ic = fi * 3 + 2;
      }

      const [nx, ny, nz] = currNormals[fi];

      for (const vi of [ia, ib, ic]) {
        const src = vi * 3;
        diffPositions.push(currData.positions[src], currData.positions[src + 1], currData.positions[src + 2]);
        diffNormals.push(nx, ny, nz);
      }

      diffIndices.push(vIdx, vIdx + 1, vIdx + 2);
      vIdx += 3;
    }

    const diffGeo = new THREE.BufferGeometry();
    diffGeo.setAttribute('position', new THREE.Float32BufferAttribute(diffPositions, 3));
    diffGeo.setAttribute('normal', new THREE.Float32BufferAttribute(diffNormals, 3));
    diffGeo.setIndex(diffIndices);

    const diffMat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.diffMesh = new THREE.Mesh(diffGeo, diffMat);
    this.scene.add(this.diffMesh);

    this.highlightStartTime = performance.now();
  }

  private removeDiffMesh(): void {
    if (this.diffMesh) {
      this.scene.remove(this.diffMesh);
      this.diffMesh.geometry.dispose();
      (this.diffMesh.material as THREE.Material).dispose();
      this.diffMesh = null;
    }
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = this.clock.getDelta();
      const time = performance.now();

      this.frameCount++;
      if (time - this.fpsUpdateTime >= 1000) {
        this.fps = Math.round(this.frameCount * 1000 / (time - this.fpsUpdateTime));
        this.frameCount = 0;
        this.fpsUpdateTime = time;
        this.emitStats();
      }

      const period = 10000;
      const elapsed = time - this.rotateStartTime;
      const angleY = (elapsed % period) / period * Math.PI * 2;
      if (this.mesh) this.mesh.rotation.y = angleY;
      if (this.wireframeMesh) this.wireframeMesh.rotation.y = angleY;
      if (this.haloMesh) {
        this.haloMesh.rotation.y = angleY;
        const pulse = 1 + 0.03 * Math.sin(time * 0.006);
        this.haloMesh.scale.setScalar(pulse);
        const haloMat = this.haloMesh.material as THREE.MeshBasicMaterial;
        haloMat.opacity = 0.15 + 0.1 * (0.5 + 0.5 * Math.sin(time * 0.004));
      }
      if (this.diffMesh) this.diffMesh.rotation.y = angleY;

      if (this.diffHighlightEnabled && this.diffMesh) {
        const diffElapsed = time - this.highlightStartTime;
        if (diffElapsed < 3000) {
          const blink = 0.5 + 0.5 * Math.sin(diffElapsed / 1000 * Math.PI * 2);
          const diffMat = this.diffMesh.material as THREE.MeshBasicMaterial;
          diffMat.opacity = 0.3 + blink * 0.5;
        } else {
          this.diffHighlightEnabled = false;
          this.removeDiffMesh();
        }
      }

      this.controls.update();
      this.lastTime = time;
      this.renderer.render(this.scene, this.camera);
    };
    this.fpsUpdateTime = performance.now();
    animate();
  }

  public dispose(): void {
    this.removeDiffMesh();
    this.setHaloVisible(false);
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      (this.wireframeMesh.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    this.controls.dispose();
  }
}
