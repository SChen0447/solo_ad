import * as THREE from 'three';
import type { VoxelData } from './UIDataManager';

interface VoxelAnimState {
  type: 'add' | 'remove';
  progress: number;
  duration: number;
}

export class Renderer3D {
  private scene: THREE.Scene;
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;

  private voxelGroup: THREE.Group;
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private edgeMeshes: Map<string, THREE.LineSegments> = new Map();
  private voxelPositions: Map<string, { color: string; index: number }> = new Map();
  private voxelColors: Set<string> = new Set();

  private highlightMesh: THREE.Mesh | null = null;

  private voxelGeometry: THREE.BoxGeometry;
  private edgeGeometry: THREE.EdgesGeometry;
  private dummy: THREE.Object3D;

  private animatingVoxels: Map<string, VoxelAnimState> = new Map();
  private tempVoxels: Set<string> = new Set();
  private onVoxelAnimComplete?: (key: string, type: 'add' | 'remove') => void;

  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, container: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x1a2332, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.voxelGroup = new THREE.Group();
    this.scene.add(this.voxelGroup);

    this.voxelGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.edgeGeometry = new THREE.EdgesGeometry(this.voxelGeometry);
    this.dummy = new THREE.Object3D();

    this.createHighlightMesh();
    this.setupResize();
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setVoxelAnimCompleteCallback(cb: (key: string, type: 'add' | 'remove') => void): void {
    this.onVoxelAnimComplete = cb;
  }

  private getKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private getOrCreateMaterial(color: string): THREE.MeshStandardMaterial {
    if (this.materialCache.has(color)) {
      return this.materialCache.get(color)!;
    }
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 1
    });
    this.materialCache.set(color, mat);
    return mat;
  }

  private createHighlightMesh(): void {
    const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    this.highlightMesh = new THREE.Mesh(geo, mat);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    this.highlightMesh.add(edges);
  }

  showHighlight(x: number, y: number, z: number): void {
    if (!this.highlightMesh) return;
    this.highlightMesh.position.set(x, y, z);
    this.highlightMesh.visible = true;
  }

  hideHighlight(): void {
    if (this.highlightMesh) {
      this.highlightMesh.visible = false;
    }
  }

  rebuildAllVoxels(voxels: VoxelData[]): void {
    this.clearAllVoxels();
    for (const v of voxels) {
      const key = this.getKey(v.x, v.y, v.z);
      if (!this.tempVoxels.has(key)) {
        this.addVoxelToData(v.x, v.y, v.z, v.color);
      }
    }
    this.rebuildMeshes();
  }

  private clearAllVoxels(): void {
    for (const mesh of this.instancedMeshes.values()) {
      this.voxelGroup.remove(mesh);
      mesh.dispose();
    }
    for (const edges of this.edgeMeshes.values()) {
      this.voxelGroup.remove(edges);
      edges.geometry.dispose();
      (edges.material as THREE.Material).dispose();
    }
    this.instancedMeshes.clear();
    this.edgeMeshes.clear();
    this.voxelPositions.clear();
    this.voxelColors.clear();
  }

  addVoxel(x: number, y: number, z: number, color: string): void {
    const key = this.getKey(x, y, z);
    if (this.voxelPositions.has(key)) return;

    this.tempVoxels.add(key);
    this.animatingVoxels.set(key, {
      type: 'add',
      progress: 0,
      duration: 0.2
    });
    this.addVoxelToData(x, y, z, color);
    this.rebuildMeshes();
  }

  removeVoxel(x: number, y: number, z: number): void {
    const key = this.getKey(x, y, z);
    const posInfo = this.voxelPositions.get(key);
    if (!posInfo) return;

    this.animatingVoxels.set(key, {
      type: 'remove',
      progress: 0,
      duration: 0.15
    });
  }

  private addVoxelToData(x: number, y: number, z: number, color: string): void {
    const key = this.getKey(x, y, z);
    this.voxelColors.add(color);

    if (!this.instancedMeshes.has(color)) {
      this.voxelPositions.forEach((info) => {
        if (info.color === color) {
          info.index = -1;
        }
      });
    }

    this.voxelPositions.set(key, { color, index: -1 });
  }

  private removeVoxelFromData(x: number, y: number, z: number): void {
    const key = this.getKey(x, y, z);
    const posInfo = this.voxelPositions.get(key);
    if (!posInfo) return;

    const color = posInfo.color;
    this.voxelPositions.delete(key);

    let hasColorRemaining = false;
    this.voxelPositions.forEach((info) => {
      if (info.color === color) hasColorRemaining = true;
    });

    if (!hasColorRemaining) {
      this.voxelColors.delete(color);
      const mesh = this.instancedMeshes.get(color);
      const edges = this.edgeMeshes.get(color);
      if (mesh) {
        this.voxelGroup.remove(mesh);
        mesh.dispose();
        this.instancedMeshes.delete(color);
      }
      if (edges) {
        this.voxelGroup.remove(edges);
        edges.geometry.dispose();
        (edges.material as THREE.Material).dispose();
        this.edgeMeshes.delete(color);
      }
      if (this.materialCache.has(color)) {
        this.materialCache.get(color)!.dispose();
        this.materialCache.delete(color);
      }
    }
  }

  private rebuildMeshes(): void {
    const colorToPositions: Map<string, Array<{ x: number; y: number; z: number; key: string }>> = new Map();

    this.voxelPositions.forEach((info, key) => {
      const [sx, sy, sz] = key.split(',').map(Number);
      if (!colorToPositions.has(info.color)) {
        colorToPositions.set(info.color, []);
      }
      colorToPositions.get(info.color)!.push({ x: sx, y: sy, z: sz, key });
    });

    colorToPositions.forEach((positions, color) => {
      let mesh = this.instancedMeshes.get(color);
      let edges = this.edgeMeshes.get(color);
      const count = positions.length;

      if (!mesh || mesh.count !== count) {
        if (mesh) {
          this.voxelGroup.remove(mesh);
          mesh.dispose();
        }
        if (edges) {
          this.voxelGroup.remove(edges);
          edges.geometry.dispose();
          (edges.material as THREE.Material).dispose();
        }

        mesh = new THREE.InstancedMesh(this.voxelGeometry, this.getOrCreateMaterial(color), count);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.instancedMeshes.set(color, mesh);
        this.voxelGroup.add(mesh);

        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.35
        });
        edges = new THREE.LineSegments(this.edgeGeometry, edgeMat);
        (edges as any).instanceMatrix = mesh.instanceMatrix;
        (edges as any).count = count;
        (edges as any).frustumCulled = false;
        this.edgeMeshes.set(color, edges);
        this.voxelGroup.add(edges);
      }

      positions.forEach((pos, idx) => {
        this.dummy.position.set(pos.x, pos.y, pos.z);
        const animState = this.animatingVoxels.get(pos.key);
        if (animState && animState.type === 'add') {
          const s = this.easeOutBack(animState.progress) * 0.5 + 0.5;
          this.dummy.scale.setScalar(s);
        } else if (animState && animState.type === 'remove') {
          const s = 1 - animState.progress;
          this.dummy.scale.setScalar(Math.max(0.001, s));
        } else {
          this.dummy.scale.setScalar(1);
        }
        this.dummy.updateMatrix();
        mesh!.setMatrixAt(idx, this.dummy.matrix);
        const info = this.voxelPositions.get(pos.key);
        if (info) info.index = idx;
      });

      mesh.instanceMatrix.needsUpdate = true;
    });

    this.updateInstanceOpacities();
  }

  private updateInstanceOpacities(): void {
    this.voxelPositions.forEach((info, key) => {
      const animState = this.animatingVoxels.get(key);
      if (!animState) return;

      const mesh = this.instancedMeshes.get(info.color);
      if (!mesh) return;

      if (animState.type === 'remove') {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const opacity = 1 - animState.progress;
        mat.opacity = Math.max(0, opacity);
      } else if (animState.type === 'add') {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = 1;
      }
    });
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  update(deltaTime: number): void {
    let needsRebuild = false;
    let needsOpacityUpdate = false;
    const completedKeys: string[] = [];

    this.animatingVoxels.forEach((state, key) => {
      state.progress += deltaTime / state.duration;
      if (state.progress >= 1) {
        state.progress = 1;
        completedKeys.push(key);
      }
      if (state.type === 'remove') needsOpacityUpdate = true;
    });

    if (this.animatingVoxels.size > 0) {
      needsRebuild = true;
    }

    for (const key of completedKeys) {
      const state = this.animatingVoxels.get(key)!;
      this.animatingVoxels.delete(key);
      this.tempVoxels.delete(key);

      if (state.type === 'remove') {
        const [x, y, z] = key.split(',').map(Number);
        this.removeVoxelFromData(x, y, z);
        needsRebuild = true;
      }

      if (this.onVoxelAnimComplete) {
        this.onVoxelAnimComplete(key, state.type);
      }
    }

    if (needsRebuild) {
      this.rebuildMeshes();
    } else if (needsOpacityUpdate) {
      this.updateInstanceOpacities();
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  pickVoxel(raycaster: THREE.Raycaster): { x: number; y: number; z: number; color: string; faceNormal: THREE.Vector3 } | null {
    const meshes = Array.from(this.instancedMeshes.values());
    if (meshes.length === 0) return null;

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const mesh = hit.object as THREE.InstancedMesh;
    const instanceId = hit.instanceId;
    if (instanceId === undefined) return null;

    let foundColor: string | null = null;
    let foundKey: string | null = null;

    this.voxelPositions.forEach((info, key) => {
      if (info.color && info.index === instanceId && this.instancedMeshes.get(info.color) === mesh) {
        foundColor = info.color;
        foundKey = key;
      }
    });

    if (!foundColor || !foundKey) return null;

    const fk: string = foundKey as string;
    const [x, y, z] = fk.split(',').map(Number);
    const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
    normal.transformDirection(mesh.matrixWorld);

    return { x, y, z, color: foundColor, faceNormal: normal };
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  dispose(): void {
    this.voxelGeometry.dispose();
    this.edgeGeometry.dispose();
    for (const mat of this.materialCache.values()) mat.dispose();
    this.clearAllVoxels();
    this.renderer.dispose();
  }
}
