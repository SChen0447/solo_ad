import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import type { SceneContext } from './sceneSetup';

export type SkylineMode = 'center-decay' | 'linear-rise' | 'jagged-wave' | 'uniform';

interface ControlPoint {
  mesh: THREE.Mesh;
  targetHeight: number;
  currentHeight: number;
  animStart: number;
  animFrom: number;
}

interface Building {
  mesh: THREE.Mesh;
  gridX: number;
  gridZ: number;
  baseHeight: number;
  targetHeight: number;
  currentHeight: number;
  animStart: number;
  animFrom: number;
}

const EASE_DURATION = 500;
const CONTROL_POINT_RADIUS = 1.2;
const BUILDING_SIZE = 3.0;
const BUILDING_GAP = 0.6;
const BUILDING_STEP = BUILDING_SIZE + BUILDING_GAP;
const GRID_ROWS = 12;
const GRID_COLS = 12;
const PLANNING_SIZE = 60;
const HEIGHT_MIN = 0;
const HEIGHT_MAX = 50;

export interface BuildingSnapshot {
  heights: Float32Array;
  positions: Float32Array;
}

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
  private comparisonGroupA: THREE.Group | null = null;
  private comparisonGroupB: THREE.Group | null = null;

  private controls: any;

  constructor(ctx: SceneContext) {
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.renderer = ctx.renderer;
    this.controls = ctx.controls;

    this.createPlanningArea();
    this.createControlPoints();
    this.createBuildings();
    this.setupDragControls();
  }

  private createPlanningArea(): void {
    const geo = new THREE.PlaneGeometry(PLANNING_SIZE, PLANNING_SIZE, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x121226,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.7,
    });
    const plane = new THREE.Mesh(geo, mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.02;
    plane.receiveShadow = true;
    this.scene.add(plane);

    const edgeGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(PLANNING_SIZE, 0.2, PLANNING_SIZE)
    );
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x3366aa,
      transparent: true,
      opacity: 0.3,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    edges.position.y = 0.1;
    this.scene.add(edges);
  }

  private createControlPoints(): void {
    const positions = [
      { x: -18, z: -18 },
      { x: 0, z: -18 },
      { x: 18, z: -18 },
      { x: -18, z: 0 },
      { x: 0, z: 0 },
      { x: 18, z: 0 },
      { x: -18, z: 18 },
      { x: 0, z: 18 },
      { x: 18, z: 18 },
    ];

    for (const pos of positions) {
      const h = 20;
      const geo = new THREE.CylinderGeometry(
        CONTROL_POINT_RADIUS,
        CONTROL_POINT_RADIUS,
        1,
        24,
        1
      );
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3388ff,
        transparent: true,
        opacity: 0.5,
        roughness: 0.7,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, h / 2, pos.z);
      mesh.scale.y = h;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.scene.add(mesh);

      const ringGeo = new THREE.RingGeometry(
        CONTROL_POINT_RADIUS + 0.4,
        CONTROL_POINT_RADIUS + 0.9,
        36
      );
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x5599ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.03, pos.z);
      this.scene.add(ring);

      this.controlPoints.push({
        mesh,
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

        const geo = new THREE.BoxGeometry(BUILDING_SIZE, 1, BUILDING_SIZE);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x8888aa,
          roughness: 0.7,
          metalness: 0.25,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.scale.y = h;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        this.buildings.push({
          mesh,
          gridX: x,
          gridZ: z,
          baseHeight: 1,
          targetHeight: h,
          currentHeight: h,
          animStart: 0,
          animFrom: h,
        });
      }
    }
  }

  private computeInterpolatedHeight(bx: number, bz: number): number {
    const distances: { dist: number; height: number }[] = [];

    for (const cp of this.controlPoints) {
      const dx = bx - cp.mesh.position.x;
      const dz = bz - cp.mesh.position.z;
      const distSq = dx * dx + dz * dz;
      distances.push({ dist: Math.sqrt(distSq), height: cp.targetHeight });
    }

    distances.sort((a, b) => a.dist - b.dist);

    const nearestCount = Math.min(3, distances.length);
    let totalWeight = 0;
    let weightedHeight = 0;

    for (let i = 0; i < nearestCount; i++) {
      const d = distances[i];
      const w = 1 / (d.dist * d.dist + 1);
      totalWeight += w;
      weightedHeight += w * d.height;
    }

    const result = totalWeight > 0 ? weightedHeight / totalWeight : 0;
    return THREE.MathUtils.clamp(result, HEIGHT_MIN, HEIGHT_MAX);
  }

  private setupDragControls(): void {
    const meshes = this.controlPoints.map((cp) => cp.mesh);

    this.dragControls = new DragControls(meshes, this.camera, this.renderer.domElement);

    this.dragControls.addEventListener('dragstart', () => {
      this.orbitEnabled = false;
      this.controls.enabled = false;
    });

    this.dragControls.addEventListener('drag', (event) => {
      const obj = event.object as THREE.Mesh;
      const half = PLANNING_SIZE / 2;

      obj.position.x = THREE.MathUtils.clamp(obj.position.x, -half, half);
      obj.position.z = THREE.MathUtils.clamp(obj.position.z, -half, half);

      const h = THREE.MathUtils.clamp(
        obj.scale.y > 0 ? obj.scale.y : obj.position.y * 2,
        HEIGHT_MIN,
        HEIGHT_MAX
      );
      obj.scale.y = h;
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
      this.controls.enabled = true;
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
        cp.mesh.scale.y = Math.max(cp.currentHeight, 0.01);
        cp.mesh.position.y = cp.currentHeight / 2;
      }
    }

    for (const b of this.buildings) {
      if (Math.abs(b.currentHeight - b.targetHeight) > 0.01) {
        const elapsed = now - b.animStart;
        const t = Math.min(elapsed / EASE_DURATION, 1);
        const eased = easeInOut(t);
        b.currentHeight = b.animFrom + (b.targetHeight - b.animFrom) * eased;
        const h = Math.max(b.currentHeight, 0.05);
        b.mesh.scale.y = h;
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
          const ratio = 1 - (distFromCenter / maxDist) * 0.85;
          cp.targetHeight = HEIGHT_MAX * ratio;
          break;
        }
        case 'linear-rise': {
          const ratio = (px + half) / PLANNING_SIZE;
          cp.targetHeight = HEIGHT_MIN + (HEIGHT_MAX - HEIGHT_MIN) * ratio;
          break;
        }
        case 'jagged-wave': {
          const wave = Math.sin(px * 0.12) * Math.cos(pz * 0.12) * 0.5 + 0.5;
          const noise = 0.7 + ((px * 13.7 + pz * 23.1) % 1) * 0.6;
          cp.targetHeight = HEIGHT_MAX * wave * noise;
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

  getCurrentSnapshot(): BuildingSnapshot {
    const heights = new Float32Array(this.buildings.length);
    const positions = new Float32Array(this.controlPoints.length * 3);
    for (let i = 0; i < this.buildings.length; i++) {
      heights[i] = this.buildings[i].currentHeight;
    }
    for (let i = 0; i < this.controlPoints.length; i++) {
      const cp = this.controlPoints[i];
      positions[i * 3] = cp.mesh.position.x;
      positions[i * 3 + 1] = cp.mesh.position.z;
      positions[i * 3 + 2] = cp.currentHeight;
    }
    return { heights, positions };
  }

  showComparison(snapshotA: BuildingSnapshot, colorA: number, colorB: number): void {
    if (this.comparisonGroupA || this.comparisonGroupB) {
      this.hideComparison();
    }

    const offset = PLANNING_SIZE / 2 + 5;

    this.comparisonGroupA = new THREE.Group();
    this.comparisonGroupB = new THREE.Group();

    const matA = new THREE.MeshStandardMaterial({
      color: colorA,
      transparent: true,
      opacity: 0.5,
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      const h = Math.max(snapshotA.heights[i], 0.05);
      const geo = new THREE.BoxGeometry(BUILDING_SIZE, 1, BUILDING_SIZE);
      const mesh = new THREE.Mesh(geo, matA);
      mesh.position.set(b.gridX - offset, h / 2, b.gridZ);
      mesh.scale.y = h;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.comparisonGroupA.add(mesh);
    }

    const labelA = this.createLabel('方案A', colorA);
    labelA.position.set(-offset, 0.5, -PLANNING_SIZE / 2 - 2);
    this.comparisonGroupA.add(labelA);

    const matB = new THREE.MeshStandardMaterial({
      color: colorB,
      transparent: true,
      opacity: 0.5,
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (const b of this.buildings) {
      const h = Math.max(b.currentHeight, 0.05);
      const geo = new THREE.BoxGeometry(BUILDING_SIZE, 1, BUILDING_SIZE);
      const mesh = new THREE.Mesh(geo, matB);
      mesh.position.set(b.gridX + offset, h / 2, b.gridZ);
      mesh.scale.y = h;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.comparisonGroupB.add(mesh);
    }

    const labelB = this.createLabel('方案B (当前)', colorB);
    labelB.position.set(offset, 0.5, -PLANNING_SIZE / 2 - 2);
    this.comparisonGroupB.add(labelB);

    this.scene.add(this.comparisonGroupA);
    this.scene.add(this.comparisonGroupB);

    for (const b of this.buildings) {
      b.mesh.visible = false;
    }
    for (const cp of this.controlPoints) {
      cp.mesh.visible = false;
    }
  }

  private createLabel(text: string, _color: number): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(8, 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.lookAt(this.camera.position);
    return mesh;
  }

  hideComparison(): void {
    [this.comparisonGroupA, this.comparisonGroupB].forEach((group) => {
      if (group) {
        this.scene.remove(group);
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              if ((child.material as any).map) {
                (child.material as any).map.dispose();
              }
              child.material.dispose();
            }
          }
        });
      }
    });

    this.comparisonGroupA = null;
    this.comparisonGroupB = null;

    for (const b of this.buildings) {
      b.mesh.visible = true;
    }
    for (const cp of this.controlPoints) {
      cp.mesh.visible = true;
    }
  }

  hasComparison(): boolean {
    return this.comparisonGroupA !== null && this.comparisonGroupB !== null;
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
