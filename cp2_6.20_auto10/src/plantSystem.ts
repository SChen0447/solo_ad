import * as THREE from 'three';
import type { EnvironmentParams } from './environmentPanel';

interface PlantNodeData {
  id: string;
  type: 'trunk' | 'branch' | 'leaf' | 'seed';
  parentId: string | null;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  direction: THREE.Vector3;
  currentLength: number;
  targetLength: number;
  thickness: number;
  targetThickness: number;
  growthProgress: number;
  leafUnfoldProgress: number;
  branchLevel: number;
  leafSide: number;
  spawnedBranches: number[];
  spawnedLeavesAt: number[];
  birthTime: number;
  mesh?: THREE.Object3D;
}

interface NodeSnapshot {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  growthProgress: number;
  leafUnfoldProgress: number;
  visible: boolean;
  color?: [number, number, number];
}

export interface GrowthSnapshot {
  timestamp: number;
  nodes: NodeSnapshot[];
  params: EnvironmentParams;
}

type SnapshotListener = (snapshot: GrowthSnapshot) => void;

export class PlantSystem {
  public readonly group: THREE.Group;
  private scene: THREE.Scene;
  private nodes: Map<string, PlantNodeData> = new Map();
  private nodeIdCounter = 0;
  private elapsedTime = 0;
  private totalGrowthTime = 40000;
  private isGrowthComplete = false;
  private params: EnvironmentParams = { light: 60, moisture: 70, temperature: 25 };
  private targetParams: EnvironmentParams = { light: 60, moisture: 70, temperature: 25 };
  private transitionProgress = 1;
  private leafColorTransition = 0;
  private prevGrowthHeight = 0;
  private trunkMaterial: THREE.MeshStandardMaterial;
  private branchMaterial: THREE.MeshStandardMaterial;
  private leafMaterial: THREE.MeshStandardMaterial;
  private seedMesh: THREE.Mesh | null = null;
  private groundLevel = 0;
  private maxHeight = 4;
  private targetTrunkThickness = 0.3;
  private leafBaseWidth = 0.3;
  private leafBaseHeight = 0.15;
  private snapshotListeners: SnapshotListener[] = [];

  private sharedCylinderGeo: THREE.CylinderGeometry;
  private sharedLeafGeo: THREE.PlaneGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'PlantSystem';

    this.sharedCylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);
    this.sharedLeafGeo = new THREE.PlaneGeometry(1, 1, 1, 1);

    this.trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.55,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    this.branchMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    this.leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e8e41,
      roughness: 0.45,
      metalness: 0.02,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x0a2a0a),
      emissiveIntensity: 0.15,
    });

    this.createSeed();
    scene.add(this.group);
  }

  public addSnapshotListener(listener: SnapshotListener): void {
    this.snapshotListeners.push(listener);
  }

  public setTargetParams(params: EnvironmentParams): void {
    this.targetParams = { ...params };
    this.transitionProgress = 0;
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public getTotalGrowthTime(): number {
    return this.totalGrowthTime;
  }

  public isComplete(): boolean {
    return this.isGrowthComplete;
  }

  public restoreSnapshot(snapshot: GrowthSnapshot): void {
    snapshot.nodes.forEach(snap => {
      const node = this.nodes.get(snap.id);
      if (!node || !node.mesh) return;
      node.mesh.position.set(snap.position[0], snap.position[1], snap.position[2]);
      node.mesh.rotation.set(snap.rotation[0], snap.rotation[1], snap.rotation[2]);
      node.mesh.scale.set(snap.scale[0], snap.scale[1], snap.scale[2]);
      node.mesh.visible = snap.visible;
      if (snap.color && node.mesh instanceof THREE.Mesh) {
        const m = node.mesh.material as THREE.MeshStandardMaterial;
        if (m.color) m.color.setRGB(snap.color[0], snap.color[1], snap.color[2]);
      }
    });
    if (this.seedMesh) {
      this.seedMesh.visible = this.elapsedTime < 2500;
    }
  }

  public takeSnapshot(params: EnvironmentParams): GrowthSnapshot {
    const nodes: NodeSnapshot[] = [];
    this.nodes.forEach((node, id) => {
      if (!node.mesh) return;
      const color: [number, number, number] | undefined =
        node.mesh instanceof THREE.Mesh
          ? (() => {
              const m = node.mesh.material as THREE.MeshStandardMaterial;
              return m.color ? [m.color.r, m.color.g, m.color.b] : undefined;
            })()
          : undefined;
      nodes.push({
        id,
        position: [node.mesh.position.x, node.mesh.position.y, node.mesh.position.z],
        rotation: [node.mesh.rotation.x, node.mesh.rotation.y, node.mesh.rotation.z],
        scale: [node.mesh.scale.x, node.mesh.scale.y, node.mesh.scale.z],
        growthProgress: node.growthProgress,
        leafUnfoldProgress: node.leafUnfoldProgress,
        visible: node.mesh.visible,
        color,
      });
    });
    return { timestamp: this.elapsedTime, nodes, params: { ...params } };
  }

  public update(dtMs: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dtMs / 1000);
      const t = this.easeInOutCubic(this.transitionProgress);
      this.params = {
        light: this.lerp(this.params.light, this.targetParams.light, t),
        moisture: this.lerp(this.params.moisture, this.targetParams.moisture, t),
        temperature: this.lerp(this.params.temperature, this.targetParams.temperature, t),
      };
    }
    if (this.leafColorTransition < 1) {
      this.leafColorTransition = Math.min(1, this.leafColorTransition + dtMs / 800);
      this.updateLeafColor();
    }
    if (JSON.stringify(this.params) !== JSON.stringify(this.targetParams)) {
      this.leafColorTransition = 0;
    }

    const speedMultiplier = 1 + ((this.params.light - 60) / 10) * 0.1;
    if (!this.isGrowthComplete) {
      this.elapsedTime += dtMs * Math.max(0.2, speedMultiplier);
      this.animateSeed(dtMs);
      this.grow(dtMs, speedMultiplier);
    }
    this.applyLeafWobble();
    this.emitSnapshotIfNeeded();
  }

  private emitSnapshotIfNeeded(): void {
    if (this.snapshotListeners.length === 0) return;
    const snap = this.takeSnapshot(this.params);
    this.snapshotListeners.forEach(l => l(snap));
  }

  private createSeed(): void {
    const geo = new THREE.SphereGeometry(0.3, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.7,
      metalness: 0.05,
    });
    this.seedMesh = new THREE.Mesh(geo, mat);
    this.seedMesh.position.set(0, this.groundLevel - 0.1, 0);
    this.group.add(this.seedMesh);
  }

  private seedEmerging = false;
  private seedEmersionProgress = 0;

  private animateSeed(dtMs: number): void {
    if (!this.seedMesh) return;
    if (!this.seedEmerging && this.elapsedTime > 1500) {
      this.seedEmerging = true;
    }
    if (this.seedEmerging && this.seedEmersionProgress < 1) {
      this.seedEmersionProgress = Math.min(1, this.seedEmersionProgress + dtMs / 1500);
      const t = this.easeOutCubic(this.seedEmersionProgress);
      this.seedMesh.position.y = this.groundLevel - 0.1 + t * 0.15;
      this.seedMesh.scale.setScalar(0.3 + t * 0.7);
      this.seedMesh.visible = this.elapsedTime < 3500;
      if (this.seedEmersionProgress >= 0.5 && this.nodes.size === 0) {
        this.spawnTrunk();
      }
    }
  }

  private spawnTrunk(): void {
    const id = this.nextId();
    const trunk: PlantNodeData = {
      id,
      type: 'trunk',
      parentId: null,
      basePosition: new THREE.Vector3(0, this.groundLevel, 0),
      baseRotation: new THREE.Euler(0, 0, 0),
      direction: new THREE.Vector3(0, 1, 0),
      currentLength: 0,
      targetLength: this.maxHeight,
      thickness: 0.02,
      targetThickness: this.targetTrunkThickness,
      growthProgress: 0,
      leafUnfoldProgress: 0,
      branchLevel: 0,
      leafSide: 0,
      spawnedBranches: [],
      spawnedLeavesAt: [],
      birthTime: this.elapsedTime,
    };
    trunk.mesh = this.createSegmentMesh(trunk);
    this.nodes.set(id, trunk);
    this.group.add(trunk.mesh);
  }

  private createSegmentMesh(node: PlantNodeData): THREE.Mesh {
    const mat = node.type === 'trunk' ? this.trunkMaterial : this.branchMaterial;
    const mesh = new THREE.Mesh(this.sharedCylinderGeo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
  }

  private createLeafMesh(node: PlantNodeData): THREE.Mesh {
    const mesh = new THREE.Mesh(this.sharedLeafGeo, this.leafMaterial.clone());
    return mesh;
  }

  private grow(dtMs: number, speedMult: number): void {
    if (this.elapsedTime > this.totalGrowthTime + 500) {
      this.isGrowthComplete = true;
      return;
    }

    const trunk = this.getTrunk();
    if (!trunk) return;

    const growthRatePerSec = 0.3; // 0.15 units per 0.5s = 0.3/s
    const dtSec = dtMs / 1000;
    const trunkDelta = growthRatePerSec * dtSec * speedMult;

    if (trunk.currentLength < trunk.targetLength) {
      trunk.currentLength = Math.min(trunk.targetLength, trunk.currentLength + trunkDelta);
      trunk.thickness = this.lerp(0.02, trunk.targetThickness, trunk.currentLength / trunk.targetLength);
      trunk.growthProgress = trunk.currentLength / trunk.targetLength;
      this.updateSegmentMesh(trunk);
      this.checkBranchSpawns(trunk);
      this.checkLeafSpawns(trunk);
    }

    this.nodes.forEach(node => {
      if (node.id === trunk.id) return;
      if (node.type === 'branch' && node.growthProgress < 1) {
        const parent = node.parentId ? this.nodes.get(node.parentId) : null;
        if (!parent) return;
        const branchDelta = growthRatePerSec * 0.65 * dtSec * speedMult;
        node.currentLength = Math.min(node.targetLength, node.currentLength + branchDelta);
        node.growthProgress = node.currentLength / node.targetLength;
        node.thickness = this.lerp(0.015, node.targetThickness, node.growthProgress);
        this.updateSegmentMesh(node);
        this.updateBranchWorldPosition(node);
        this.checkLeafSpawns(node);
      }
      if (node.type === 'leaf' && node.leafUnfoldProgress < 1) {
        node.leafUnfoldProgress = Math.min(1, node.leafUnfoldProgress + dtMs / 400);
        this.updateLeafMesh(node);
      }
    });
  }

  private getTrunk(): PlantNodeData | undefined {
    for (const node of this.nodes.values()) {
      if (node.type === 'trunk') return node;
    }
    return undefined;
  }

  private updateSegmentMesh(node: PlantNodeData): void {
    if (!node.mesh) return;
    const mesh = node.mesh as THREE.Mesh;
    const len = Math.max(0.001, node.currentLength);
    const thick = Math.max(0.005, node.thickness);
    mesh.scale.set(thick, len, thick);
    const tip = node.direction.clone().multiplyScalar(len / 2);
    mesh.position.copy(node.basePosition).add(tip);
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, node.direction.clone().normalize());
    mesh.quaternion.copy(quat);
  }

  private updateBranchWorldPosition(node: PlantNodeData): void {
    if (!node.parentId || node.type !== 'branch') return;
    const parent = this.nodes.get(node.parentId);
    if (!parent) return;
    const attachRatio = (node as unknown as { _attachRatio?: number })._attachRatio ?? 0.4;
    (node as unknown as { _attachRatio: number })._attachRatio = attachRatio;
    const attachLen = parent.currentLength * attachRatio;
    const attachPos = parent.direction.clone().multiplyScalar(attachLen).add(parent.basePosition);
    node.basePosition.copy(attachPos);
    this.updateSegmentMesh(node);
  }

  private checkBranchSpawns(node: PlantNodeData): void {
    if (node.type === 'leaf' || node.type === 'seed') return;
    if (node.branchLevel >= 2) return;

    const growthMeters = Math.floor(node.currentLength);
    const moistureBoost = (this.params.moisture - 70) / 10 * 0.5;
    const baseProbability = 0.65 + moistureBoost;

    for (let i = 0; i <= growthMeters; i++) {
      if (i < 1) continue;
      if (node.spawnedBranches.includes(i)) continue;
      if (i * 1 > node.currentLength - 0.15) continue;
      const roll = Math.random();
      if (roll < baseProbability) {
        node.spawnedBranches.push(i);
        this.spawnBranch(node, i);
        if (Math.random() < baseProbability * 0.55) {
          this.spawnBranch(node, i, true);
        }
      }
    }
  }

  private spawnBranch(parent: PlantNodeData, heightIndex: number, opposite = false): void {
    const id = this.nextId();
    const attachRatio = heightIndex / parent.targetLength;
    const attachLen = parent.currentLength * attachRatio;
    const basePos = parent.direction.clone().multiplyScalar(attachLen).add(parent.basePosition);

    const angleRad = THREE.MathUtils.degToRad(45 + Math.random() * 30);
    const twist = (opposite ? Math.PI : 0) + (Math.random() - 0.5) * 0.6;
    const perp = new THREE.Vector3(Math.cos(twist), 0, Math.sin(twist)).normalize();
    const dir = parent.direction.clone()
      .applyAxisAngle(perp, angleRad)
      .normalize();

    const targetLen = this.maxHeight * (0.45 + Math.random() * 0.25) * (1 - parent.branchLevel * 0.25);
    const targetThicknessValue = Math.min(0.18, parent.targetThickness * 0.55);

    const branch: PlantNodeData = {
      id,
      type: 'branch',
      parentId: parent.id,
      basePosition: basePos.clone(),
      baseRotation: new THREE.Euler(),
      direction: dir,
      currentLength: 0,
      targetLength: targetLen,
      thickness: 0.01,
      targetThickness: targetThicknessValue,
      growthProgress: 0,
      leafUnfoldProgress: 0,
      branchLevel: parent.branchLevel + 1,
      leafSide: opposite ? -1 : 1,
      spawnedBranches: [],
      spawnedLeavesAt: [],
      birthTime: this.elapsedTime,
    };
    (branch as unknown as { _attachRatio: number })._attachRatio = attachRatio;
    branch.mesh = this.createSegmentMesh(branch);
    this.nodes.set(id, branch);
    this.group.add(branch.mesh);
  }

  private checkLeafSpawns(node: PlantNodeData): void {
    if (node.type === 'leaf' || node.type === 'seed') return;
    if (node.currentLength < 0.5) return;

    const interval = 0.2;
    const steps = Math.floor(node.currentLength / interval);
    for (let i = 2; i < steps; i++) {
      if (node.spawnedLeavesAt.includes(i)) continue;
      const len = i * interval;
      if (len > node.currentLength - 0.05) continue;
      node.spawnedLeavesAt.push(i);
      this.spawnLeaf(node, len, i % 2 === 0 ? 1 : -1);
    }
  }

  private spawnLeaf(parent: PlantNodeData, attachLen: number, side: number): void {
    const id = this.nextId();
    const basePos = parent.direction.clone().multiplyScalar(attachLen).add(parent.basePosition);

    const perp = new THREE.Vector3().crossVectors(parent.direction, new THREE.Vector3(0, 1, 0));
    if (perp.lengthSq() < 0.001) perp.set(1, 0, 0);
    perp.normalize().multiplyScalar(side);
    const leafDir = parent.direction.clone()
      .add(perp.multiplyScalar(0.8))
      .add(new THREE.Vector3(0, 0.2, 0))
      .normalize();

    const tempFactor = 1 - Math.abs(this.params.temperature - 25) / 25;
    const sizeScale = 0.6 + Math.max(0, tempFactor) * 0.8;

    const leaf: PlantNodeData = {
      id,
      type: 'leaf',
      parentId: parent.id,
      basePosition: basePos.clone(),
      baseRotation: new THREE.Euler(),
      direction: leafDir,
      currentLength: this.leafBaseWidth * sizeScale,
      targetLength: this.leafBaseWidth * sizeScale,
      thickness: this.leafBaseHeight * sizeScale,
      targetThickness: this.leafBaseHeight * sizeScale,
      growthProgress: 1,
      leafUnfoldProgress: 0,
      branchLevel: parent.branchLevel + 1,
      leafSide: side,
      spawnedBranches: [],
      spawnedLeavesAt: [],
      birthTime: this.elapsedTime,
    };
    (leaf as unknown as { _offsetY: number })._offsetY = Math.random() * Math.PI * 2;
    (leaf as unknown as { _leafPhase: number })._leafPhase = Math.random() * Math.PI * 2;
    leaf.mesh = this.createLeafMesh(leaf);
    this.nodes.set(id, leaf);
    this.group.add(leaf.mesh);
    this.updateLeafMesh(leaf);
    this.applyLeafColorToMesh(leaf.mesh as THREE.Mesh);
  }

  private updateLeafMesh(node: PlantNodeData): void {
    if (!node.mesh) return;
    const mesh = node.mesh as THREE.Mesh;
    const unfold = node.leafUnfoldProgress;
    const t = this.easeOutCubic(unfold);
    const w = node.currentLength;
    const h = node.thickness;
    const scaleX = w * (0.3 + t * 0.7);
    const scaleY = h * (0.2 + t * 0.8);
    const curl = (1 - t) * 0.8;
    mesh.scale.set(scaleX, scaleY, 1);

    const tip = node.direction.clone().multiplyScalar(w * 0.5);
    mesh.position.copy(node.basePosition).add(tip);

    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, node.direction.clone().normalize());
    const curlAxis = new THREE.Vector3().crossVectors(up, node.direction).normalize();
    if (curlAxis.lengthSq() > 0.001) {
      quat.multiply(new THREE.Quaternion().setFromAxisAngle(curlAxis, -curl));
    }
    mesh.quaternion.copy(quat);
  }

  private applyLeafColorToMesh(mesh: THREE.Mesh): void {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (!mat || !mat.color) return;
    const light = this.params.light;
    const l = light / 100;
    const h = this.lerp(120, 75, l);
    const s = this.lerp(50, 70, l);
    const v = this.lerp(25, 55, l);
    const color = new THREE.Color().setHSL(h / 360, s / 100, v / 100);
    mat.color.copy(color);
    mat.emissive = new THREE.Color().setHSL(h / 360, 0.6, 0.1);
    mat.emissiveIntensity = 0.1 + l * 0.15;
  }

  private updateLeafColor(): void {
    this.nodes.forEach(node => {
      if (node.type === 'leaf' && node.mesh) {
        this.applyLeafColorToMesh(node.mesh as THREE.Mesh);
      }
    });
  }

  private applyLeafWobble(): void {
    const tSec = this.elapsedTime / 1000;
    this.nodes.forEach(node => {
      if (node.type !== 'leaf' || !node.mesh) return;
      const phase = (node as unknown as { _leafPhase?: number })._leafPhase ?? 0;
      const offset = Math.sin(tSec * Math.PI + phase) * 0.01;
      const tip = node.direction.clone().multiplyScalar(node.currentLength * 0.5);
      this.nodeOriginalBase = this.nodeOriginalBase ?? new Map();
      if (!this.nodeOriginalBase.has(node.id)) {
        this.nodeOriginalBase.set(node.id, node.basePosition.clone());
      }
      const base = this.nodeOriginalBase.get(node.id)!;
      (node.mesh as THREE.Mesh).position.copy(base).add(tip).y += offset;
    });
  }
  private nodeOriginalBase: Map<string, THREE.Vector3> | null = null;

  private nextId(): string {
    return `n_${(this.nodeIdCounter++).toString(36)}`;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    this.sharedCylinderGeo.dispose();
    this.sharedLeafGeo.dispose();
    this.trunkMaterial.dispose();
    this.branchMaterial.dispose();
    this.leafMaterial.dispose();
  }

  public getLeafCount(): number {
    let c = 0;
    this.nodes.forEach(n => { if (n.type === 'leaf') c++; });
    return c;
  }

  public getBranchCount(): number {
    let c = 0;
    this.nodes.forEach(n => { if (n.type === 'branch') c++; });
    return c;
  }
}
