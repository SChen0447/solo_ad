import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WindVector, WindGridData, IncrementalUpdate } from '@/services/WindApiService';

export interface RenderParams {
  timeStep: number;
  heightLevel: number;
  particleDensity: number;
}

export interface WindSceneCallbacks {
  onFpsUpdate?: (fps: number) => void;
  onAltitudeUpdate?: (altitude: number) => void;
  onPerformanceWarning?: () => void;
}

interface FlowLine {
  id: number;
  points: THREE.Vector3[];
  targetPoints: THREE.Vector3[];
  speeds: number[];
  particleMesh: THREE.Points;
  arrowMesh: THREE.Mesh;
  active: boolean;
}

const POINTS_PER_LINE = 50;
const HEIGHT_SCALE = 0.01;
const COLOR_LOW = new THREE.Color(0x00bfff);
const COLOR_HIGH = new THREE.Color(0xff4500);
const COLOR_MID1 = new THREE.Color(0x00ffff);
const COLOR_MID2 = new THREE.Color(0xffff00);

function interpolateColor(speed: number, maxSpeed: number): THREE.Color {
  const t = Math.min(1, speed / maxSpeed);
  if (t < 0.33) {
    return COLOR_LOW.clone().lerp(COLOR_MID1, t / 0.33);
  } else if (t < 0.66) {
    return COLOR_MID1.clone().lerp(COLOR_MID2, (t - 0.33) / 0.33);
  } else {
    return COLOR_MID2.clone().lerp(COLOR_HIGH, (t - 0.66) / 0.34);
  }
}

export class WindScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number = 0;

  private flowLines: FlowLine[] = [];
  private gridHelper: THREE.LineSegments | null = null;

  private windSampler: ((x: number, y: number, z: number) => { u: number; v: number; w: number; speed: number }) | null = null;
  private bounds: WindGridData['bounds'] | null = null;
  private maxSpeed: number = 10;
  private gridData: WindGridData | null = null;

  private params: RenderParams = {
    timeStep: 0.5,
    heightLevel: 2500,
    particleDensity: 100,
  };

  private targetParams: RenderParams = { ...this.params };
  private transitionStart: number = 0;
  private isTransitioning: boolean = false;
  private sceneTransitionDuration: number = 1500;
  private paramTransitionDuration: number = 300;
  private lastFrameTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private lastParticleReduction: number = 0;
  private callbacks: WindSceneCallbacks;

  private sceneRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private targetSceneRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  constructor(container: HTMLElement, callbacks: WindSceneCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a23);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 200, 200);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 500;
    this.controls.target.set(0, 0, 0);

    this.createGrid();
    this.bindEvents();
    this.startAnimation();
  }

  private createGrid() {
    const size = 200;
    const divisions = 20;
    const gridXZ = new THREE.GridHelper(size, divisions, 0x444466, 0x333355);
    gridXZ.material.transparent = true;
    gridXZ.material.opacity = 0.3;
    (gridXZ.material as THREE.LineBasicMaterial).linewidth = 0.5;
    this.scene.add(gridXZ);

    const gridXY = new THREE.GridHelper(size, divisions, 0x444466, 0x333355);
    gridXY.rotation.x = Math.PI / 2;
    gridXY.position.y = size / 2;
    gridXY.material.transparent = true;
    gridXY.material.opacity = 0.15;
    (gridXY.material as THREE.LineBasicMaterial).linewidth = 0.5;
    this.scene.add(gridXY);

    const axesHelper = new THREE.AxesHelper(120);
    (axesHelper.material as THREE.LineBasicMaterial).transparent = true;
    (axesHelper.material as THREE.LineBasicMaterial).opacity = 0.3;
    this.scene.add(axesHelper);
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('dblclick', this.handleDoubleClick);
  }

  private handleResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleDoubleClick = (e: MouseEvent) => {
    if (e.target !== this.renderer.domElement) return;
    this.resetCamera();
  };

  resetCamera() {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = new THREE.Vector3(0, 200 * Math.sin(Math.PI / 4), 200 * Math.cos(Math.PI / 4));
    const endTarget = new THREE.Vector3(0, 0, 0);
    const duration = 500;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  updateWindData(data: WindGridData | IncrementalUpdate, isFull: boolean) {
    if (isFull) {
      const fullData = data as WindGridData;
      this.gridData = fullData;
      this.bounds = fullData.bounds;
      this.maxSpeed = Math.max(...fullData.vectors.map((v) => v.speed), 10);
      this.isTransitioning = true;
      this.transitionStart = performance.now();

      const service = (window as any).__windService;
      if (service) {
        this.windSampler = service.interpolateGrid(
          fullData.vectors,
          fullData.bounds,
          fullData.gridSize
        );
      }
    } else if (this.gridData) {
      const incData = data as IncrementalUpdate;
      const existingVectors = [...this.gridData.vectors];
      incData.vectors.forEach((v) => {
        const idx = existingVectors.findIndex(
          (ev) =>
            Math.abs(ev.x - v.x) < 0.01 &&
            Math.abs(ev.y - v.y) < 0.01 &&
            Math.abs(ev.z - v.z) < 0.01
        );
        if (idx >= 0) {
          existingVectors[idx] = v;
        }
      });
      this.gridData = { ...this.gridData, vectors: existingVectors, timeStep: incData.timeStep };
      this.maxSpeed = Math.max(...existingVectors.map((v) => v.speed), 10);

      const service = (window as any).__windService;
      if (service && this.bounds) {
        this.windSampler = service.interpolateGrid(
          existingVectors,
          this.bounds,
          this.gridData.gridSize
        );
      }
    }
  }

  setTargetParams(params: Partial<RenderParams>) {
    this.targetParams = { ...this.targetParams, ...params };
    this.isTransitioning = true;
    this.transitionStart = performance.now();
  }

  getParams(): RenderParams {
    return { ...this.params };
  }

  getFps(): number {
    return this.fps;
  }

  private ensureFlowLines(count: number) {
    while (this.flowLines.length < count) {
      this.flowLines.push(this.createFlowLine(this.flowLines.length));
    }
    while (this.flowLines.length > count) {
      const line = this.flowLines.pop()!;
      this.scene.remove(line.particleMesh);
      this.scene.remove(line.arrowMesh);
      line.particleMesh.geometry.dispose();
      (line.particleMesh.material as THREE.Material).dispose();
      line.arrowMesh.geometry.dispose();
      (line.arrowMesh.material as THREE.Material).dispose();
    }
  }

  private createFlowLine(id: number): FlowLine {
    const points: THREE.Vector3[] = [];
    const targetPoints: THREE.Vector3[] = [];
    const speeds: number[] = [];

    for (let i = 0; i < POINTS_PER_LINE; i++) {
      points.push(new THREE.Vector3());
      targetPoints.push(new THREE.Vector3());
      speeds.push(0);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(POINTS_PER_LINE * 3);
    const colors = new Float32Array(POINTS_PER_LINE * 3);
    const sizes = new Float32Array(POINTS_PER_LINE);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const particleMesh = new THREE.Points(geometry, material);

    const coneGeometry = new THREE.ConeGeometry(3, 6, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.7,
    });
    const arrowMesh = new THREE.Mesh(coneGeometry, coneMaterial);

    this.scene.add(particleMesh);
    this.scene.add(arrowMesh);

    this.resetFlowLinePosition({
      id,
      points,
      targetPoints,
      speeds,
      particleMesh,
      arrowMesh,
      active: true,
    });

    return {
      id,
      points,
      targetPoints,
      speeds,
      particleMesh,
      arrowMesh,
      active: true,
    };
  }

  private resetFlowLinePosition(line: FlowLine) {
    if (!this.bounds || !this.windSampler) return;

    const zLevel = this.params.heightLevel * HEIGHT_SCALE;
    const startX = this.bounds.xMin + Math.random() * (this.bounds.xMax - this.bounds.xMin);
    const startY = this.bounds.yMin + Math.random() * (this.bounds.yMax - this.bounds.yMin);
    const startZ = Math.max(this.bounds.zMin, Math.min(this.bounds.zMax, zLevel + (Math.random() - 0.5) * 20));

    let x = startX;
    let y = startY;
    let z = startZ;

    const stepSize = 2;

    for (let i = 0; i < POINTS_PER_LINE; i++) {
      const vec = this.windSampler(x, y, z);
      const mag = Math.max(0.001, Math.sqrt(vec.u * vec.u + vec.v * vec.v + vec.w * vec.w));
      x += (vec.u / mag) * stepSize;
      y += (vec.v / mag) * stepSize;
      z += (vec.w / mag) * stepSize;

      z = Math.max(this.bounds.zMin, Math.min(this.bounds.zMax, z));
      x = Math.max(this.bounds.xMin, Math.min(this.bounds.xMax, x));
      y = Math.max(this.bounds.yMin, Math.min(this.bounds.yMax, y));

      line.points[i].set(x, y, z);
      line.targetPoints[i].set(x, y, z);
      line.speeds[i] = vec.speed;
    }
  }

  private startAnimation() {
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      this.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private update() {
    const now = performance.now();
    const delta = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.fps = (this.frameCount * 1000) / (now - this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      this.callbacks.onFpsUpdate?.(this.fps);

      if (this.fps < 20 && now - this.lastParticleReduction > 5000) {
        this.lastParticleReduction = now;
        this.callbacks.onPerformanceWarning?.();
      }
    }

    this.controls.update();

    if (this.isTransitioning) {
      const elapsed = now - this.transitionStart;
      const t = Math.min(1, elapsed / this.paramTransitionDuration);
      const ease = 1 - Math.pow(1 - t, 3);

      this.params.timeStep = this.params.timeStep + (this.targetParams.timeStep - this.params.timeStep) * ease;
      this.params.heightLevel = this.params.heightLevel + (this.targetParams.heightLevel - this.params.heightLevel) * ease;
      this.params.particleDensity = Math.round(
        this.params.particleDensity + (this.targetParams.particleDensity - this.params.particleDensity) * ease
      );

      if (t >= 1) {
        this.params = { ...this.targetParams };
        this.isTransitioning = false;
      }
    }

    this.callbacks.onAltitudeUpdate?.(this.params.heightLevel);

    this.ensureFlowLines(this.params.particleDensity);
    this.flowLines.forEach((line) => this.updateFlowLine(line, delta, now));
  }

  private updateFlowLine(line: FlowLine, delta: number, now: number) {
    if (!this.bounds || !this.windSampler) return;

    const timeScale = this.params.timeStep;
    const stepSize = 1.5 * timeScale;
    const zLevel = this.params.heightLevel * HEIGHT_SCALE;
    const zTolerance = 30 * HEIGHT_SCALE;

    const head = line.points[POINTS_PER_LINE - 1];
    const vec = this.windSampler(head.x, head.y, head.z);
    const mag = Math.max(0.001, Math.sqrt(vec.u * vec.u + vec.v * vec.v + vec.w * vec.w));

    const newHead = new THREE.Vector3(
      head.x + (vec.u / mag) * stepSize,
      head.y + (vec.v / mag) * stepSize,
      head.z + (vec.w / mag) * stepSize
    );

    newHead.x = Math.max(this.bounds.xMin, Math.min(this.bounds.xMax, newHead.x));
    newHead.y = Math.max(this.bounds.yMin, Math.min(this.bounds.yMax, newHead.y));
    newHead.z = Math.max(this.bounds.zMin, Math.min(this.bounds.zMax, newHead.z));

    const outOfBounds =
      Math.abs(newHead.z - zLevel) > zTolerance * 2 ||
      newHead.x <= this.bounds.xMin + 0.1 ||
      newHead.x >= this.bounds.xMax - 0.1 ||
      newHead.y <= this.bounds.yMin + 0.1 ||
      newHead.y >= this.bounds.yMax - 0.1;

    if (outOfBounds) {
      this.resetFlowLinePosition(line);
    } else {
      for (let i = 0; i < POINTS_PER_LINE - 1; i++) {
        line.points[i].copy(line.points[i + 1]);
        line.speeds[i] = line.speeds[i + 1];
      }
      line.points[POINTS_PER_LINE - 1].copy(newHead);
      line.speeds[POINTS_PER_LINE - 1] = vec.speed;
    }

    const geometry = line.particleMesh.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < POINTS_PER_LINE; i++) {
      positions[i * 3] = line.points[i].x;
      positions[i * 3 + 1] = line.points[i].y;
      positions[i * 3 + 2] = line.points[i].z;

      const color = interpolateColor(line.speeds[i], this.maxSpeed);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      const alpha = (i + 1) / POINTS_PER_LINE;
      const speedFactor = Math.min(1, line.speeds[i] / this.maxSpeed);
      sizes[i] = (0.5 + speedFactor * 2.5) * alpha;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;

    const arrowPos = line.points[POINTS_PER_LINE - 1];
    line.arrowMesh.position.copy(arrowPos);

    if (mag > 0.001) {
      const dir = new THREE.Vector3(vec.u / mag, vec.v / mag, vec.w / mag);
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      line.arrowMesh.rotation.setFromQuaternion(quaternion);
    }

    const arrowColor = interpolateColor(vec.speed, this.maxSpeed);
    (line.arrowMesh.material as THREE.MeshBasicMaterial).color.copy(arrowColor);
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('dblclick', this.handleDoubleClick);

    this.flowLines.forEach((line) => {
      this.scene.remove(line.particleMesh);
      this.scene.remove(line.arrowMesh);
      line.particleMesh.geometry.dispose();
      (line.particleMesh.material as THREE.Material).dispose();
      line.arrowMesh.geometry.dispose();
      (line.arrowMesh.material as THREE.Material).dispose();
    });

    this.flowLines = [];
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
