import * as THREE from 'three';

export interface EnvironmentParams {
  light: number;
  water: number;
  temperature: number;
}

interface BranchData {
  mesh: THREE.Mesh;
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
  private readonly BRANCH_GROWTH_RATE = 0.3;
  private readonly SEGMENT_HEIGHT = 1;
  private growthMultiplier = 1;
  private snapshots: PlantSnapshot[] = [];
  private isReplaying = false;
  private baseBranchCount = 0;
  private grownBranchesThisSegment = new Set<number>();
  private lastSegmentLevel = -1;
  private leafColorFrom: THREE.Color = new THREE.Color(0x1B5E20);
  private leafColorTo: THREE.Color = new THREE.Color(0x1B5E20);
  private leafColorProgress: number = 1;
  private readonly LEAF_COLOR_TRANSITION_DURATION: number = 0.8;

  constructor() {
    this.group = new THREE.Group();
    this.seed = this.createSeed();
    this.group.add(this.seed);
    this.baseBranchCount = this.calculateTargetBranchCount();
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

  private getGrowthMultiplier(): number {
    const lightFactor = 1 + ((this.envParams.light - 60) / 10) * 0.1;
    return Math.max(0.3, Math.min(2, lightFactor));
  }

  private shouldSpawnBranch(_segmentLevel: number): boolean {
    if (this.branches.length >= this.baseBranchCount) return false;
    const waterBonus = (this.envParams.water / 10) * 0.5;
    const probability = Math.min(1, 0.55 + waterBonus);
    return Math.random() < probability;
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

  private spawnTrunkBranch(startY: number): void {
    const angle = Math.random() * Math.PI * 2;
    const branchAngle = THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(45, 75));
    const direction = new THREE.Vector3(
      Math.sin(angle) * Math.sin(branchAngle),
      Math.cos(branchAngle),
      Math.cos(angle) * Math.sin(branchAngle)
    ).normalize();

    const position = new THREE.Vector3(0, startY, 0);
    const thickness = THREE.MathUtils.randFloat(0.08, 0.15);
    const height = THREE.MathUtils.randFloat(0.8, 1.8);

    const mesh = this.createBranch(position, direction, thickness, height, 0x6D4C41);
    this.group.add(mesh);

    this.branches.push({
      mesh,
      startY,
      targetHeight: height,
      currentHeight: 0,
      growthStartTime: this.elapsedTime,
      thickness,
      parentIndex: 0,
      angle,
      direction,
      position: position.clone()
    });
  }

  private spawnLeavesOnBranch(branch: BranchData, branchIdx: number): void {
    const leafCount = 2 + Math.floor(Math.random() * 2);
    const scaleFactor = this.getLeafScaleFactor();
    const baseSize = 0.3 * scaleFactor;

    for (let i = 0; i < leafCount; i++) {
      const t = (i + 1) / (leafCount + 1);
      const side = i % 2 === 0 ? 1 : -1;

      const perpX = new THREE.Vector3(-branch.direction.z, 0, branch.direction.x).normalize();
      const leafDir = perpX.multiplyScalar(side);
      const leafPos = branch.position.clone().add(
        branch.direction.clone().multiplyScalar(branch.currentHeight * t)
      ).add(leafDir.clone().multiplyScalar(0.05));

      const leaf = this.createLeaf();
      leaf.position.copy(leafPos);

      const up = new THREE.Vector3(0, 1, 0);
      const targetDir = branch.direction.clone().lerp(leafDir, 0.4).add(new THREE.Vector3(0, 0.3, 0)).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, targetDir);
      leaf.quaternion.copy(quat);

      leaf.scale.set(baseSize, baseSize, baseSize * 0.1);
      this.group.add(leaf);

      this.leaves.push({
        mesh: leaf,
        branchIndex: branchIdx,
        positionOnBranch: t,
        side,
        curlProgress: 0,
        targetCurl: 1,
        phase: Math.random() * Math.PI * 2,
        basePosition: leafPos.clone(),
        baseScale: baseSize
      });
    }
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
    if (this.snapshots.length < 2) return;

    let idx = 0;
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (time >= this.snapshots[i].time && time <= this.snapshots[i + 1].time) {
        idx = i;
        break;
      }
    }

    const s1 = this.snapshots[idx];
    const s2 = this.snapshots[Math.min(idx + 1, this.snapshots.length - 1)];
    const totalT = s2.time - s1.time;
    const localT = totalT === 0 ? 0 : (time - s1.time) / totalT;

    while (this.branches.length < s1.branches.length) {
      const tempBranch = this.createBranch(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1, 0),
        0.1, 1
      );
      this.group.add(tempBranch);
      this.branches.push({
        mesh: tempBranch,
        startY: 0, targetHeight: 1, currentHeight: 0,
        growthStartTime: 0, thickness: 0.1, parentIndex: 0,
        angle: 0, direction: new THREE.Vector3(0, 1, 0),
        position: new THREE.Vector3()
      });
    }
    while (this.branches.length > s1.branches.length) {
      const b = this.branches.pop()!;
      this.group.remove(b.mesh);
    }

    s1.branches.forEach((sb, i) => {
      const b = this.branches[i];
      const next = s2.branches[i] || sb;
      b.mesh.position.set(
        this.lerp(sb.position[0], next.position[0], localT),
        this.lerp(sb.position[1], next.position[1], localT),
        this.lerp(sb.position[2], next.position[2], localT)
      );
      b.mesh.rotation.set(
        this.lerp(sb.rotation[0], next.rotation[0], localT),
        this.lerp(sb.rotation[1], next.rotation[1], localT),
        this.lerp(sb.rotation[2], next.rotation[2], localT)
      );
      b.mesh.scale.set(
        this.lerp(sb.scale[0], next.scale[0], localT),
        this.lerp(sb.scale[1], next.scale[1], localT),
        this.lerp(sb.scale[2], next.scale[2], localT)
      );
    });

    while (this.leaves.length < s1.leaves.length) {
      const leaf = this.createLeaf();
      this.group.add(leaf);
      this.leaves.push({
        mesh: leaf,
        branchIndex: 0, positionOnBranch: 0, side: 0,
        curlProgress: 0, targetCurl: 1, phase: 0,
        basePosition: new THREE.Vector3(), baseScale: 0.3
      });
    }
    while (this.leaves.length > s1.leaves.length) {
      const l = this.leaves.pop()!;
      this.group.remove(l.mesh);
    }

    s1.leaves.forEach((sl, i) => {
      const l = this.leaves[i];
      const next = s2.leaves[i] || sl;
      l.mesh.position.set(
        this.lerp(sl.position[0], next.position[0], localT),
        this.lerp(sl.position[1], next.position[1], localT),
        this.lerp(sl.position[2], next.position[2], localT)
      );
      l.mesh.rotation.set(
        this.lerp(sl.rotation[0], next.rotation[0], localT),
        this.lerp(sl.rotation[1], next.rotation[1], localT),
        this.lerp(sl.rotation[2], next.rotation[2], localT)
      );
      l.mesh.scale.set(
        this.lerp(sl.scale[0], next.scale[0], localT),
        this.lerp(sl.scale[1], next.scale[1], localT),
        this.lerp(sl.scale[2], next.scale[2], localT)
      );
      const mat = l.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setStyle(sl.color);
    });

    this.seed.position.set(
      this.lerp(s1.seed.position[0], s2.seed.position[0], localT),
      this.lerp(s1.seed.position[1], s2.seed.position[1], localT),
      this.lerp(s1.seed.position[2], s2.seed.position[2], localT)
    );
    const seedScale = this.lerp(s1.seed.scale, s2.seed.scale, localT);
    this.seed.scale.set(seedScale, seedScale, seedScale);
    this.seed.visible = s1.seed.visible;
  }

  public update(fixedDelta: number, actualTime: number): void {
    this.elapsedTime = actualTime;
    this.lerpEnvParams();
    this.growthMultiplier = this.getGrowthMultiplier();
    this.updateLeafColorTransition(fixedDelta);

    if (this.isReplaying) return;

    const seedScale = Math.max(0.01, 1 - Math.max(0, Math.min(1, (actualTime - 0.5) / 1.5)));
    this.seed.scale.setScalar(seedScale);
    if (actualTime > 2) this.seed.visible = false;

    const growthProgress = Math.min(1, actualTime / this.GROWTH_DURATION);
    const targetTrunkHeight = 4 * growthProgress;
    const segmentLevel = Math.floor(targetTrunkHeight / this.SEGMENT_HEIGHT);

    if (segmentLevel !== this.lastSegmentLevel && segmentLevel > 0) {
      this.lastSegmentLevel = segmentLevel;
      this.grownBranchesThisSegment.clear();
    }

    if (this.branches.length === 0 || !this.isTrunk(this.branches[0])) {
      const trunkDir = new THREE.Vector3(0, 1, 0);
      const trunkPos = new THREE.Vector3(0, 0, 0);
      const trunkMesh = this.createBranch(trunkPos, trunkDir, 0.15, 0.01, 0x5D4037);
      this.group.add(trunkMesh);
      this.branches.unshift({
        mesh: trunkMesh,
        startY: 0,
        targetHeight: 4,
        currentHeight: 0,
        growthStartTime: 0.5,
        thickness: 0.15,
        parentIndex: -1,
        angle: 0,
        direction: trunkDir.clone(),
        position: trunkPos.clone()
      });
    }

    const trunk = this.branches[0];
    if (actualTime >= trunk.growthStartTime && trunk.currentHeight < targetTrunkHeight) {
      const growthAmount = this.BRANCH_GROWTH_RATE * this.growthMultiplier * fixedDelta;
      trunk.currentHeight = Math.min(targetTrunkHeight, trunk.currentHeight + growthAmount);
      this.updateBranchMesh(trunk);

      const currentSegments = Math.floor(trunk.currentHeight / this.SEGMENT_HEIGHT);
      for (let level = 1; level <= currentSegments; level++) {
        if (!this.grownBranchesThisSegment.has(level)) {
          if (this.shouldSpawnBranch(level)) {
            this.spawnTrunkBranch(level * this.SEGMENT_HEIGHT);
          }
          this.grownBranchesThisSegment.add(level);
        }
      }
    }

    for (let i = 1; i < this.branches.length; i++) {
      const branch = this.branches[i];
      if (actualTime >= branch.growthStartTime && branch.currentHeight < branch.targetHeight) {
        const growthAmount = this.BRANCH_GROWTH_RATE * 0.7 * this.growthMultiplier * fixedDelta;
        const wasZero = branch.currentHeight === 0;
        branch.currentHeight = Math.min(branch.targetHeight, branch.currentHeight + growthAmount);
        this.updateBranchMesh(branch);
        if (wasZero || Math.random() < 0.02) {
          const hasLeaves = this.leaves.some(l => l.branchIndex === i);
          if (!hasLeaves && branch.currentHeight / branch.targetHeight > 0.3) {
            this.spawnLeavesOnBranch(branch, i);
          }
        }
      }
    }

    this.leaves.forEach(leaf => {
      if (leaf.curlProgress < leaf.targetCurl) {
        leaf.curlProgress = Math.min(1, leaf.curlProgress + fixedDelta / 0.4);
        const curl = 1 - leaf.curlProgress;
        const s = leaf.baseScale;
        leaf.mesh.scale.set(
          s * (0.3 + 0.7 * leaf.curlProgress),
          s * (0.3 + 0.7 * leaf.curlProgress),
          s * 0.1 * (0.2 + 0.8 * (1 - curl * 0.5))
        );
      }

      const float = Math.sin(actualTime * 0.5 * Math.PI * 2 + leaf.phase) * 0.01;
      leaf.mesh.position.y = leaf.basePosition.y + float;
    });

    const scaleFactor = this.getLeafScaleFactor();
    this.leaves.forEach(leaf => {
      const targetScale = leaf.baseScale * (leaf.baseScale / 0.3) * scaleFactor * (0.3 + 0.7 * leaf.curlProgress) / (leaf.baseScale / 0.3);
      const currentX = leaf.mesh.scale.x;
      const newScale = currentX + (targetScale - currentX) * 0.05;
      leaf.mesh.scale.set(newScale, newScale, newScale * 0.1);
    });
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

    branch.mesh.scale.set(1, h / Math.max(0.01, h > 0 ? h : 0.01), 1);

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
