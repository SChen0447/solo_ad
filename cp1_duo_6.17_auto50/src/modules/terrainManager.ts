import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import type { SceneContext } from './sceneSetup';

export type SkylineMode = 'center-decay' | 'linear-rise' | 'jagged-wave' | 'uniform';

interface ControlPoint {
  mesh: THREE.Mesh;
  baseY: number;
  targetHeight: number;
  currentHeight: number;
  animStart: number;
  animFrom: number;
}

interface Building {
  mesh: THREE.Mesh;
  gridX: number;
  gridZ: number;
  targetHeight: number;
  currentHeight: number;
  animStart: number;
  animFrom: number;
}

interface Snapshot {
  heights: Float32Array;
}

const EASE_DURATION = 500;
const CONTROL_POINT_RADIUS = 1.2;
const BUILDING_SIZE = 3.2;
const BUILDING_GAP = 0.4;
const BUILDING_STEP = BUILDING_SIZE + BUILDING_GAP;
const GRID_ROWS = 10;
const GRID_COLS = 14;
const PLANNING_SIZE = 80;
const HEIGHT_MIN = 0;
const HEIGHT_MAX = 50;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class TerrainManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controlPoints: ControlPoint[] = [];
  private buildings: Building[] = [];
  private dragControls: DragControls | null = null;
  private orbitEnabled = true;
  private snapshot: Snapshot | null = null;
  private comparisonGroup: THREE.Group | null = null;
  private isCompareMode = false;

  private onFrameCallback: ((dt: number) => void) | null = null;

  constructor(ctx: SceneContext) {
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.renderer = ctx.renderer;

    this.createPlanningArea();
    this.createControlPoints();
    this.createBuildings();
    this.setupDragControls();

    ctx.onFrame = (dt: number) => {
      this.updateAnimations(performance.now());
    };
  }

  private createPlanningArea(): void {
    const borderGeo = new THREE.BufferGeometry();
    const half = PLANNING_SIZE / 2;
    const h = 0.15;
    const verts = new Float32Array([
      -half, h, -half, half, h, -half, half, h, half, -half, h, half,
    ]);
    borderGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    borderGeo.setIndex([0, 1, 2, 0, 2, 3]);
    borderGeo.computeVertexNormals();
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x15152a,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5,
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.receiveShadow = true;
    this.scene.add(borderMesh);
  }

  private createControlPoints(): void {
    const positions = [
      { x: -25, z: -25 },
      { x: 0, z: -25 },
      { x: 25, z: -25 },
      { x: -25, z: 0 },
      { x: 0, z: 0 },
      { x: 25, z: 0 },
      { x: -25, z: 25 },
      { x: 0, z: 25 },
      { x: 25, z: 25 },
    ];

    const cpMat = new THREE.MeshPhongMaterial({
      color: 0x3388ff,
      transparent: true,
      opacity: 0.55,
      emissive: 0x1155aa,
      emissiveIntensity: 0.3,
      shininess: 80,
    });

    for (const pos of positions) {
      const h = 20;
      const geo = new THREE.CylinderGeometry(
        CONTROL_POINT_RADIUS,
        CONTROL_POINT_RADIUS,
        Math.max(h, 0.1),
        16,
        1
      );
      const mesh = new THREE.Mesh(geo, cpMat.clone());
      mesh.position.set(pos.x, h / 2, pos.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const ringGeo = new THREE.RingGeometry(CONTROL_POINT_RADIUS + 0.3, CONTROL_POINT_RADIUS + 0.7, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x5599ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.05, pos.z);
      this.scene.add(ring);

      this.controlPoints.push({
        mesh,
        baseY: h / 2,
        targetHeight: h,
        currentHeight: h,
        animStart: 0,
        animFrom: h,
      });
    }
  }

  private createBuildings(): void {
    const startX = -(GRID_COLS - 1) * BUILDING_STEP / 2;
    const startZ = -(GRID_ROWS - 1) * BUILDING_STEP / 2;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = startX + col * BUILDING_STEP;
        const z = startZ + row * BUILDING_STEP;
        const h = this.computeInterpolatedHeight(x, z);

        const geo = new THREE.BoxGeometry(BUILDING_SIZE, Math.max(h, 0.1), BUILDING_SIZE);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x8888aa,
          roughness: 0.7,
          metalness: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        this.buildings.push({
          mesh,
          gridX: x,
          gridZ: z,
          targetHeight: h,
          currentHeight: h,
          animStart: 0,
          animFrom: h,
        });
      }
    }
  }

  private computeInterpolatedHeight(bx: number, bz: number): number {
    let totalWeight = 0;
    let weightedHeight = 0;

    for (const cp of this.controlPoints) {
      const dx = bx - cp.mesh.position.x;
      const dz = bz - cp.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const w = 1 / (dist * dist + 1);
      totalWeight += w;
      weightedHeight += w * cp.targetHeight;
    }

    return totalWeight > 0 ? weightedHeight / totalWeight : 0;
  }

  private setupDragControls(): void {
    const meshes = this.controlPoints.map((cp) => cp.mesh);

    this.dragControls = new DragControls(meshes, this.camera, this.renderer.domElement);

    this.dragControls.addEventListener('dragstart', () => {
      this.orbitEnabled = false;
    });

    this.dragControls.addEventListener('drag', (event) => {
      const obj = event.object as THREE.Mesh;
      obj.position.x = THREE.MathUtils.clamp(obj.position.x, -PLANNING_SIZE / 2, PLANNING_SIZE / 2);
      obj.position.z = THREE.MathUtils.clamp(obj.position.z, -PLANNING_SIZE / 2, PLANNING_SIZE / 2);

      const h = THREE.MathUtils.clamp(obj.position.y * 2, HEIGHT_MIN, HEIGHT_MAX);
      obj.position.y = h / 2;

      const cp = this.controlPoints.find((c) => c.mesh === obj);
      if (cp) {
        cp.targetHeight = h;
        cp.currentHeight = h;
        cp.animFrom = h;
        this.updateBuildingTargets();
      }
    });

    this.dragControls.addEventListener('dragend', () => {
      this.orbitEnabled = true;
    });
  }

  private updateBuildingTargets(): void {
    const now = performance.now();
    for (const b of this.buildings) {
      const newH = this.computeInterpolatedHeight(b.gridX, b.gridZ);
      b.animFrom = b.currentHeight;
      b.targetHeight = newH;
      b.animStart = now;
    }
  }

  updateAnimations(now: number): void {
    for (const cp of this.controlPoints) {
      if (Math.abs(cp.currentHeight - cp.targetHeight) > 0.01) {
        const elapsed = now - cp.animStart;
        const t = Math.min(elapsed / EASE_DURATION, 1);
        const eased = easeInOut(t);
        cp.currentHeight = cp.animFrom + (cp.targetHeight - cp.animFrom) * eased;
        cp.mesh.scale.y = Math.max(cp.currentHeight / cp.baseY, 0.01);
        cp.mesh.position.y = cp.currentHeight / 2;
      }
    }

    for (const b of this.buildings) {
      if (Math.abs(b.currentHeight - b.targetHeight) > 0.01) {
        const elapsed = now - b.animStart;
        const t = Math.min(elapsed / EASE_DURATION, 1);
        const eased = easeInOut(t);
        b.currentHeight = b.animFrom + (b.targetHeight - b.animFrom) * eased;
        const h = Math.max(b.currentHeight, 0.1);
        b.mesh.scale.y = h / b.currentHeight > 0.001 ? h / (b.mesh.geometry as THREE.BoxGeometry).parameters.height : 0.01;
        b.mesh.position.y = h / 2;
      }
    }
  }

  applyMode(mode: SkylineMode): void {
    const now = performance.now();
    const half = PLANNING_SIZE / 2;

    for (const cp of this.controlPoints) {
      cp.animFrom = cp.currentHeight;
      cp.animStart = now;

      const px = cp.mesh.position.x;
      const pz = cp.mesh.position.z;
      const distFromCenter = Math.sqrt(px * px + pz * pz);
      const maxDist = Math.sqrt(half * half + half * half);

      switch (mode) {
        case 'center-decay': {
          const ratio = 1 - (distFromCenter / maxDist) * 0.8;
          cp.targetHeight = HEIGHT_MAX * ratio;
          break;
        }
        case 'linear-rise': {
          const ratio = (px + half) / (PLANNING_SIZE);
          cp.targetHeight = HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * ratio;
          break;
        }
        case 'jagged-wave': {
          const wave = Math.sin(px * 0.1) * Math.cos(pz * 0.1) * 0.5 + 0.5;
          const rand = 0.7 + Math.random() * 0.6;
          cp.targetHeight = HEIGHT_MAX * wave * rand;
          break;
        }
        case 'uniform': {
          cp.targetHeight = HEIGHT_MAX * 0.5;
          break;
        }
      }

      cp.targetHeight = THREE.MathUtils.clamp(cp.targetHeight, HEIGHT_MIN, HEIGHT_MAX);
    }

    this.updateBuildingTargets();
  }

  saveSnapshot(): void {
    const heights = new Float32Array(this.buildings.length);
    for (let i = 0; i < this.buildings.length; i++) {
      heights[i] = this.buildings[i].currentHeight;
    }
    this.snapshot = { heights };
  }

  hasSnapshot(): boolean {
    return this.snapshot !== null;
  }

  toggleCompare(): boolean {
    if (this.isCompareMode) {
      this.exitCompare();
      return false;
    } else {
      this.enterCompare();
      return true;
    }
  }

  private enterCompare(): void {
    if (!this.snapshot) return;
    this.isCompareMode = true;

    this.comparisonGroup = new THREE.Group();

    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x3388ff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.6,
      metalness: 0.3,
    });

    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      const h = Math.max(this.snapshot.heights[i], 0.1);
      const geo = new THREE.BoxGeometry(BUILDING_SIZE * 0.95, h, BUILDING_SIZE * 0.95);
      const mesh = new THREE.Mesh(geo, blueMat.clone());
      mesh.position.set(b.gridX - 2, h / 2, b.gridZ);
      this.comparisonGroup.add(mesh);
    }

    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xff8833,
      transparent: true,
      opacity: 0.5,
      roughness: 0.6,
      metalness: 0.3,
    });

    for (const b of this.buildings) {
      const h = Math.max(b.currentHeight, 0.1);
      const geo = new THREE.BoxGeometry(BUILDING_SIZE * 0.95, h, BUILDING_SIZE * 0.95);
      const mesh = new THREE.Mesh(geo, orangeMat.clone());
      mesh.position.set(b.gridX + 2, h / 2, b.gridZ);
      this.comparisonGroup.add(mesh);
    }

    this.scene.add(this.comparisonGroup);

    for (const b of this.buildings) {
      b.mesh.visible = false;
    }
  }

  private exitCompare(): void {
    this.isCompareMode = false;
    if (this.comparisonGroup) {
      this.scene.remove(this.comparisonGroup);
      this.comparisonGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.comparisonGroup = null;
    }

    for (const b of this.buildings) {
      b.mesh.visible = true;
    }
  }

  getOrbitEnabled(): boolean {
    return this.orbitEnabled;
  }

  getBuildingCount(): number {
    return this.buildings.length;
  }

  getControlPointCount(): number {
    return this.controlPoints.length;
  }
}
