import * as THREE from 'three';

export interface EnvironmentParams {
  light: number;
  water: number;
  temperature: number;
}

interface BranchBlueprint {
  id: number;
  parentIndex: number;
  startY: number;
  targetHeight: number;
  thickness: number;
  angle: number;
  branchAngleRad: number;
  growthStartTime: number;
  color: number;
}

interface LeafBlueprint {
  id: number;
  branchIndex: number;
  positionOnBranch: number;
  side: number;
  phase: number;
  spawnTime: number;
}

interface BranchData {
  mesh: THREE.Mesh;
  blueprint: BranchBlueprint;
  startY: number;
  targetHeight: number;
  currentHeight: number;
  growthStartTime: number;
  thickness: number;
  parentIndex: number;
  angle: number;
  direction: THREE.Vector3;
  position: THREE.Vector3;
}

interface LeafData {
  mesh: THREE.Mesh;
  blueprint: LeafBlueprint;
  branchIndex: number;
  positionOnBranch: number;
  side: number;
  curlProgress: number;
  targetCurl: number;
  phase: number;
  basePosition: THREE.Vector3;
  baseScale: number;
}

export interface PlantSnapshot {
  time: number;
  branches: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    height: number;
  }>;
  leaves: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    curl: number;
    color: string;
  }>;
  seed: {
    position: [number, number, number];
    scale: number;
    visible: boolean;
  };
}

export class PlantSystem {
  public group: THREE.Group;
  private seed: THREE.Mesh;
  private branches: BranchData[] = [];
  private leaves: LeafData[] = [];
  private envParams: EnvironmentParams = { light: 60, water: 70, temperature: 25 };
  private targetEnvParams: EnvironmentParams = { light: 60, water: 70, temperature: 25 };
  private envTransitionProgress = 1;
  private elapsedTime = 0;
  private readonly GROWTH_DURATION = 40;
  private readonly SEGMENT_HEIGHT = 1;
  private snapshots: PlantSnapshot[] = [];
  private isReplaying = false;
  private baseBranchCount = 0;
  private leafColorFrom: THREE.Color = new THREE.Color(0x1B5E20);
  private leafColorTo: THREE.Color = new THREE.Color(0x1B5E20);
  private leafColorProgress: number = 1;
  private readonly LEAF_COLOR_TRANSITION_DURATION: number = 0.8;
  private branchBlueprints: BranchBlueprint[] = [];
  private leafBlueprints: LeafBlueprint[] = [];
  private isPlaying = true;
  private readonly RANDOM_SEED = 1337;

  constructor() {
    this.group = new THREE.Group();
    this.seed = this.createSeed();
    this.group.add(this.seed);
    this.baseBranchCount = this.calculateTargetBranchCount();
    this.generateGrowthBlueprints();
  }

  private mulberry32(seed: number): () => number {
    let a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private generateGrowthBlueprints(): void {
    const rand = this.mulberry32(this.RANDOM_SEED);
    this.branchBlueprints = [];
    this.leafBlueprints = [];
    let branchId = 0;
    let leafId = 0;

    const trunk: BranchBlueprint = {
      id: branchId++,
      parentIndex: -1,
      startY: 0,
      targetHeight: 4,
      thickness: 0.15,
      angle: 0,
      branchAngleRad: 0,
      growthStartTime: 0.5,
      color: 0x5D4037
    };
    this.branchBlueprints.push(trunk);

    const maxSegments = 4;
    for (let level = 1; level <= maxSegments; level++) {
      const waterBonus = (this.targetEnvParams.water / 10) * 0.5;
      const probability = Math.min(1, 0.55 + waterBonus);
      if (rand() < probability && this.branchBlueprints.length - 1 < this.baseBranchCount) {
        const angle = rand() * Math.PI * 2;
        const branchAngle = THREE.MathUtils.degToRad(45 + rand() * 30);
        const targetHeight = 0.8 + rand() * 1;
        const thickness = 0.08 + rand() * 0.07;
        const growthStart = 0.5 + level * 1.2 + rand() * 0.5;

        const branch: BranchBlueprint = {
          id: branchId++,
          parentIndex: 0,
          startY: level * this.SEGMENT_HEIGHT,
          targetHeight,
          thickness,
          angle,
          branchAngleRad: branchAngle,
          growthStartTime: growthStart,
          color: 0x6D4C41
        };
        this.branchBlueprints.push(branch);

        const leafCount = 2 + Math.floor(rand() * 2);
        for (let i = 0; i < leafCount; i++) {
          const t = (i + 1) / (leafCount + 1);
          const side = i % 2 === 0 ? 1 : -1;
          const phase = rand() * Math.PI * 2;
          this.leafBlueprints.push({
            id: leafId++,
            branchIndex: branch.id,
            positionOnBranch: t,
            side,
            phase,
            spawnTime: growthStart + 0.5
          });
        }
      }
    }
  }

  private createSeed(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.8,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -0.15, 0);
    mesh.castShadow = true;
    return mesh;
  }

  private createBranch(startPos: THREE.Vector3, direction: THREE.Vector3, thickness: number, height: number, color: number = 0x5D4037): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(thickness * 0.8, thickness, height, 8);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.15
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const up = new THREE.Vector3(0, 1, 0);
    const dirNorm = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dirNorm);
    mesh.quaternion.copy(quaternion);

    const halfHeight = height / 2;
    const offset = dirNorm.clone().multiplyScalar(halfHeight);
    mesh.position.copy(startPos).add(offset);

    return mesh;
  }

  private createLeaf(): THREE.Mesh {
    const curve = new THREE.EllipseCurve(0, 0, 0.15, 0.075, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(16);
    const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p.x, p.y)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: this.getLeafColor(),
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    return mesh;
  }

  private getLeafColor(): THREE.Color {
    const light = this.envParams.light;
    const t = light / 100;
    const darkGreen = new THREE.Color(0x1B5E20);
    const yellowGreen = new THREE.Color(0x9CCC65);
    return darkGreen.clone().lerp(yellowGreen, t);
  }

  private calculateTargetBranchCount(): number {
    const baseWater = 70;
    const waterDiff = this.targetEnvParams.water - baseWater;
    const extraBranches = Math.floor((waterDiff / 10) * 0.5 * 10);
    return Math.max(15, Math.min(20, 17 + extraBranches));
  }

  private getLeafScaleFactor(): number {
    const temp = this.envParams.temperature;
    const optimal = 25;
    const diff = Math.abs(temp - optimal);
    const factor = Math.max(0.5, 1 - (diff * 0.03));
    return factor;
  }

  public setEnvironmentParams(params: Partial<EnvironmentParams>): void {
    const oldLight = this.targetEnvParams.light;
    this.targetEnvParams = { ...this.targetEnvParams, ...params };
    this.envTransitionProgress = 0;
    this.baseBranchCount = this.calculateTargetBranchCount();
    if (params.light !== undefined && params.light !== oldLight) {
      this.triggerLeafColorTransition();
    }
  }

  private triggerLeafColorTransition(): void {
    this.leafColorFrom.copy(this.getLeafColorByLight(this.envParams.light));
    this.leafColorTo.copy(this.getLeafColorByLight(this.targetEnvParams.light));
    this.leafColorProgress = 0;
  }

  private getLeafColorByLight(light: number): THREE.Color {
    const t = light / 100;
    const darkGreen = new THREE.Color(0x1B5E20);
    const yellowGreen = new THREE.Color(0x9CCC65);
    return darkGreen.clone().lerp(yellowGreen, t);
  }

  private lerpEnvParams(): void {
    if (this.envTransitionProgress < 1) {
      this.envTransitionProgress = Math.min(1, this.envTransitionProgress + 1 / 60);
      const t = this.easeInOutCubic(this.envTransitionProgress);
      this.envParams.light = this.lerp(this.envParams.light, this.targetEnvParams.light, t);
      this.envParams.water = this.lerp(this.envParams.water, this.targetEnvParams.water, t);
      this.envParams.temperature = this.lerp(this.envParams.temperature, this.targetEnvParams.temperature, t);
      this.updateLeafColors();
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateLeafColors(): void {
    if (this.leafColorProgress >= 1 && this.envTransitionProgress >= 1) return;
    let t = 1;
    if (this.leafColorProgress < 1) {
      t = this.easeInOutCubic(this.leafColorProgress);
    }
    const currentColor = this.leafColorFrom.clone().lerp(this.leafColorTo, t);
    this.leaves.forEach(leaf => {
      const mat = leaf.mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(currentColor);
    });
  }

  private updateLeafColorTransition(fixedDelta: number): void {
    if (this.leafColorProgress < 1) {
      this.leafColorProgress = Math.min(
        1,
        this.leafColorProgress + fixedDelta / this.LEAF_COLOR_TRANSITION_DURATION
      );
      this.updateLeafColors();
    }
  }

  private getBranchDirection(bp: BranchBlueprint): THREE.Vector3 {
    if (this.isTrunkBlueprint(bp)) {
      return new THREE.Vector3(0, 1, 0);
    }
    return new THREE.Vector3(
      Math.sin(bp.angle) * Math.sin(bp.branchAngleRad),
      Math.cos(bp.branchAngleRad),
      Math.cos(bp.angle) * Math.sin(bp.branchAngleRad)
    ).normalize();
  }

  private isTrunkBlueprint(bp: BranchBlueprint): boolean {
    return bp.parentIndex === -1;
  }

  private instantiateBranch(bp: BranchBlueprint): BranchData {
    const direction = this.getBranchDirection(bp);
    const position = new THREE.Vector3(0, bp.startY, 0);
    const mesh = this.createBranch(position, direction, bp.thickness, Math.max(0.01, bp.targetHeight), bp.color);
    mesh.scale.set(1, 0.01 / Math.max(0.01, bp.targetHeight), 1);
    this.group.add(mesh);
    return {
      mesh,
      blueprint: bp,
      startY: bp.startY,
      targetHeight: bp.targetHeight,
      currentHeight: 0,
      growthStartTime: bp.growthStartTime,
      thickness: bp.thickness,
      parentIndex: bp.parentIndex,
      angle: bp.angle,
      direction,
      position: position.clone()
    };
  }

  private instantiateLeaf(lbp: LeafBlueprint, branchData: BranchData, currentTime: number): LeafData {
    const scaleFactor = this.getLeafScaleFactor();
    const baseSize = 0.3 * scaleFactor;

    const perpX = new THREE.Vector3(-branchData.direction.z, 0, branchData.direction.x).normalize();
    const leafDir = perpX.multiplyScalar(lbp.side);
    const leafPos = branchData.position.clone().add(
      branchData.direction.clone().multiplyScalar(branchData.currentHeight * lbp.positionOnBranch)
    ).add(leafDir.clone().multiplyScalar(0.05));

    const leaf = this.createLeaf();
    leaf.position.copy(leafPos);

    const up = new THREE.Vector3(0, 1, 0);
    const targetDir = branchData.direction.clone().lerp(leafDir, 0.4).add(new THREE.Vector3(0, 0.3, 0)).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(up, targetDir);
    leaf.quaternion.copy(quat);

    const curlProgress = Math.max(0, Math.min(1, (currentTime - lbp.spawnTime) / 0.4));
    const curl = 1 - curlProgress;
    leaf.scale.set(
      baseSize * (0.3 + 0.7 * curlProgress),
      baseSize * (0.3 + 0.7 * curlProgress),
      baseSize * 0.1 * (0.2 + 0.8 * (1 - curl * 0.5))
    );
    this.group.add(leaf);

    return {
      mesh: leaf,
      blueprint: lbp,
      branchIndex: lbp.branchIndex,
      positionOnBranch: lbp.positionOnBranch,
      side: lbp.side,
      curlProgress,
      targetCurl: 1,
      phase: lbp.phase,
      basePosition: leafPos.clone(),
      baseScale: baseSize
    };
  }

  private clearPlantMeshes(): void {
    while (this.branches.length > 0) {
      const b = this.branches.pop()!;
      if (b && b.mesh) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        const mat = b.mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else if (mat) mat.dispose();
      }
    }
    while (this.leaves.length > 0) {
      const l = this.leaves.pop()!;
      if (l && l.mesh) {
        this.group.remove(l.mesh);
        l.mesh.geometry.dispose();
        const mat = l.mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else if (mat) mat.dispose();
      }
    }
  }

  public seekToGrowthTime(targetTime: number): void {
    const t = Math.max(0, Math.min(this.GROWTH_DURATION, targetTime));
    this.elapsedTime = t;
    this.clearPlantMeshes();

    const seedScale = Math.max(0.01, 1 - Math.max(0, Math.min(1, (t - 0.5) / 1.5)));
    this.seed.scale.setScalar(seedScale);
    this.seed.visible = !(t > 2);

    const growthProgress = Math.min(1, t / this.GROWTH_DURATION);
    const targetTrunkHeight = 4 * growthProgress;

    const branchById = new Map<number, BranchData>();

    for (const bp of this.branchBlueprints) {
      const isTrunk = this.isTrunkBlueprint(bp);
      let height = 0;
      if (t >= bp.growthStartTime) {
        const growDuration = 3.5;
        const elapsed = t - bp.growthStartTime;
        if (isTrunk) {
          height = Math.min(targetTrunkHeight, bp.targetHeight * Math.min(1, elapsed / growDuration));
        } else {
          height = Math.min(bp.targetHeight, bp.targetHeight * Math.min(1, elapsed / growDuration));
        }
      }
      const branchData = this.instantiateBranch(bp);
      branchData.currentHeight = Math.max(0.01, height);
      this.updateBranchMesh(branchData);
      this.branches.push(branchData);
      branchById.set(bp.id, branchData);
    }

    for (const lbp of this.leafBlueprints) {
      if (t < lbp.spawnTime) continue;
      const branch = branchById.get(lbp.branchIndex);
      if (!branch) continue;
      if (branch.currentHeight / branch.targetHeight < 0.3) continue;
      const leaf = this.instantiateLeaf(lbp, branch, t);
      this.leaves.push(leaf);
    }

    this.updateLeafColors();
  }

  public togglePlay(): boolean {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getGrowthDuration(): number {
    return this.GROWTH_DURATION;
  }

  public startRecording(): void {
    this.snapshots = [];
  }

  public recordSnapshot(): void {
    const snapshot: PlantSnapshot = {
      time: this.elapsedTime,
      branches: this.branches.map(b => ({
        position: [b.mesh.position.x, b.mesh.position.y, b.mesh.position.z],
        rotation: [b.mesh.rotation.x, b.mesh.rotation.y, b.mesh.rotation.z],
        scale: [b.mesh.scale.x, b.mesh.scale.y, b.mesh.scale.z],
        height: b.currentHeight
      })),
      leaves: this.leaves.map(l => ({
        position: [l.mesh.position.x, l.mesh.position.y, l.mesh.position.z],
        rotation: [l.mesh.rotation.x, l.mesh.rotation.y, l.mesh.rotation.z],
        scale: [l.mesh.scale.x, l.mesh.scale.y, l.mesh.scale.z],
        curl: l.curlProgress,
        color: (l.mesh.material as THREE.MeshStandardMaterial).color.getStyle()
      })),
      seed: {
        position: [this.seed.position.x, this.seed.position.y, this.seed.position.z],
        scale: this.seed.scale.x,
        visible: this.seed.visible
      }
    };
    this.snapshots.push(snapshot);
  }

  public getSnapshots(): PlantSnapshot[] {
    return this.snapshots;
  }

  public setReplayMode(enabled: boolean): void {
    this.isReplaying = enabled;
  }

  public seekToTime(time: number): void {
    this.seekToGrowthTime(time);
  }

  public update(fixedDelta: number, _actualTime: number): void {
    if (this.isPlaying && !this.isReplaying) {
      const newTime = Math.min(this.GROWTH_DURATION, this.elapsedTime + fixedDelta);
      if (Math.abs(newTime - this.elapsedTime) > 1e-6) {
        this.seekToGrowthTime(newTime);
      }
    }
    this.lerpEnvParams();
    this.updateLeafColorTransition(fixedDelta);

    const t = this.elapsedTime;
    for (const leaf of this.leaves) {
      const float = Math.sin(t * 0.5 * Math.PI * 2 + leaf.phase) * 0.01;
      leaf.mesh.position.y = leaf.basePosition.y + float;
    }
  }

  private isTrunk(branch: BranchData): boolean {
    return branch.parentIndex === -1;
  }

  private updateBranchMesh(branch: BranchData): void {
    const isTrunk = this.isTrunk(branch);
    const h = Math.max(0.01, branch.currentHeight);
    const thickness = isTrunk
      ? 0.15 * (0.5 + 0.5 * (h / 4))
      : branch.thickness;

    branch.mesh.scale.set(1, 1, 1);

    const up = new THREE.Vector3(0, 1, 0);
    const dirNorm = branch.direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dirNorm);
    branch.mesh.quaternion.copy(quaternion);

    const halfHeight = h / 2;
    const offset = dirNorm.clone().multiplyScalar(halfHeight);
    branch.mesh.position.copy(branch.position).add(offset);

    branch.mesh.geometry.dispose();
    branch.mesh.geometry = new THREE.CylinderGeometry(thickness * 0.8, thickness, h, 8);
  }

  public getEnvironmentParams(): EnvironmentParams {
    return { ...this.envParams };
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public getGrowthProgress(): number {
    return Math.min(1, this.elapsedTime / this.GROWTH_DURATION);
  }
}
