import * as THREE from 'three';
import { VoxelData } from './UIDataManager';

interface AnimationEntry {
  key: string;
  type: 'add' | 'remove';
  startTime: number;
  duration: number;
  voxel: VoxelData;
}

export class Renderer3D {
  private scene: THREE.Scene;
  private voxelMesh: THREE.InstancedMesh | null = null;
  private wireMesh: THREE.InstancedMesh | null = null;
  private highlightMesh: THREE.Mesh;
  private groundGrid: THREE.GridHelper;
  private animations: Map<string, AnimationEntry> = new Map();
  private voxelKeys: string[] = [];
  private readonly maxInstances = 2000;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private color: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.groundGrid = new THREE.GridHelper(20, 20, 0xffffff, 0xffffff);
    (this.groundGrid.material as THREE.Material).transparent = true;
    (this.groundGrid.material as THREE.Material).opacity = 0.19;
    this.groundGrid.position.set(10, 0, 10);
    scene.add(this.groundGrid);

    const hlGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    this.highlightMesh = new THREE.Mesh(hlGeo, hlMat);
    this.highlightMesh.visible = false;
    scene.add(this.highlightMesh);

    this.initMeshes();
  }

  private initMeshes(): void {
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const voxelMat = new THREE.MeshStandardMaterial({
      vertexColors: false,
      roughness: 0.55,
      metalness: 0.1,
    });

    this.voxelMesh = new THREE.InstancedMesh(boxGeo, voxelMat, this.maxInstances);
    this.voxelMesh.count = 0;
    this.voxelMesh.castShadow = true;
    this.voxelMesh.receiveShadow = true;
    this.scene.add(this.voxelMesh);

    const wireMat = new THREE.MeshBasicMaterial({
      wireframe: true,
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
    });

    this.wireMesh = new THREE.InstancedMesh(boxGeo, wireMat, this.maxInstances);
    this.wireMesh.count = 0;
    this.scene.add(this.wireMesh);
  }

  rebuild(voxels: VoxelData[], animatingKeys: Set<string> = new Set()): void {
    const filtered = voxels.filter(v => !animatingKeys.has(`${v.x},${v.y},${v.z}`));
    this.voxelKeys = filtered.map(v => `${v.x},${v.y},${v.z}`);

    this.voxelMesh!.count = filtered.length;
    this.wireMesh!.count = filtered.length;

    for (let i = 0; i < filtered.length; i++) {
      const v = filtered[i];
      this.dummy.position.set(v.x + 0.5, v.y + 0.5, v.z + 0.5);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.voxelMesh!.setMatrixAt(i, this.dummy.matrix);
      this.wireMesh!.setMatrixAt(i, this.dummy.matrix);
      this.color.set(v.color);
      this.voxelMesh!.setColorAt(i, this.color);
    }

    this.voxelMesh!.instanceMatrix.needsUpdate = true;
    if (this.voxelMesh!.instanceColor) {
      this.voxelMesh!.instanceColor.needsUpdate = true;
    }
    this.wireMesh!.instanceMatrix.needsUpdate = true;
  }

  startAddAnimation(voxel: VoxelData): void {
    const key = `${voxel.x},${voxel.y},${voxel.z}`;
    this.animations.set(key, {
      key,
      type: 'add',
      startTime: performance.now(),
      duration: 200,
      voxel,
    });
  }

  startRemoveAnimation(voxel: VoxelData): void {
    const key = `${voxel.x},${voxel.y},${voxel.z}`;
    this.animations.set(key, {
      key,
      type: 'remove',
      startTime: performance.now(),
      duration: 150,
      voxel,
    });
  }

  updateAnimations(allVoxels: VoxelData[]): void {
    const now = performance.now();
    const animatingKeys = new Set<string>();
    const completedRemoveKeys: string[] = [];

    for (const [key, anim] of this.animations) {
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      if (t < 1) {
        animatingKeys.add(key);
      } else {
        if (anim.type === 'remove') {
          completedRemoveKeys.push(key);
        }
        this.animations.delete(key);
      }
    }

    const nonAnimatingVoxels = allVoxels.filter(v => !animatingKeys.has(`${v.x},${v.y},${v.z}`));

    let totalCount = nonAnimatingVoxels.length;
    for (const key of animatingKeys) {
      const anim = this.animations.get(key);
      if (anim) totalCount++;
    }

    this.voxelMesh!.count = Math.min(totalCount, this.maxInstances);
    this.wireMesh!.count = Math.min(totalCount, this.maxInstances);

    let idx = 0;
    for (const v of nonAnimatingVoxels) {
      if (idx >= this.maxInstances) break;
      this.dummy.position.set(v.x + 0.5, v.y + 0.5, v.z + 0.5);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.voxelMesh!.setMatrixAt(idx, this.dummy.matrix);
      this.wireMesh!.setMatrixAt(idx, this.dummy.matrix);
      this.color.set(v.color);
      this.voxelMesh!.setColorAt(idx, this.color);
      idx++;
    }

    for (const [key, anim] of this.animations) {
      if (idx >= this.maxInstances) break;
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);

      let scale: number;
      if (anim.type === 'add') {
        scale = this.elasticOut(t, 0.5, 1.0);
      } else {
        scale = 1.0 - t;
      }

      this.dummy.position.set(anim.voxel.x + 0.5, anim.voxel.y + 0.5, anim.voxel.z + 0.5);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();
      this.voxelMesh!.setMatrixAt(idx, this.dummy.matrix);
      this.wireMesh!.setMatrixAt(idx, this.dummy.matrix);
      this.color.set(anim.voxel.color);
      this.voxelMesh!.setColorAt(idx, this.color);
      idx++;
    }

    this.voxelMesh!.instanceMatrix.needsUpdate = true;
    if (this.voxelMesh!.instanceColor) {
      this.voxelMesh!.instanceColor.needsUpdate = true;
    }
    this.wireMesh!.instanceMatrix.needsUpdate = true;
  }

  private elasticOut(t: number, from: number, to: number): number {
    const range = to - from;
    if (t === 0) return from;
    if (t === 1) return to;
    const p = 0.4;
    const s = p / 4;
    const val = range * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + range;
    return from + val;
  }

  hasActiveAnimations(): boolean {
    return this.animations.size > 0;
  }

  getVoxelMesh(): THREE.InstancedMesh {
    return this.voxelMesh!;
  }

  showHighlight(x: number, y: number, z: number): void {
    this.highlightMesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.highlightMesh.visible = true;
  }

  hideHighlight(): void {
    this.highlightMesh.visible = false;
  }

  setGroundGrid(size: number): void {
    this.scene.remove(this.groundGrid);
    this.groundGrid.geometry.dispose();
    (this.groundGrid.material as THREE.Material).dispose();

    this.groundGrid = new THREE.GridHelper(size, size, 0xffffff, 0xffffff);
    (this.groundGrid.material as THREE.Material).transparent = true;
    (this.groundGrid.material as THREE.Material).opacity = 0.19;
    this.groundGrid.position.set(size / 2, 0, size / 2);
    this.scene.add(this.groundGrid);
  }

  dispose(): void {
    this.voxelMesh?.geometry.dispose();
    (this.voxelMesh?.material as THREE.Material)?.dispose();
    this.wireMesh?.geometry.dispose();
    (this.wireMesh?.material as THREE.Material)?.dispose();
    this.highlightMesh.geometry.dispose();
    (this.highlightMesh.material as THREE.Material).dispose();
    this.groundGrid.geometry.dispose();
    (this.groundGrid.material as THREE.Material).dispose();
  }
}
