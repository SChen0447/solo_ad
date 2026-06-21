import * as THREE from 'three';

export interface BranchNode {
  id: string;
  depth: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  targetEndPos: THREE.Vector3;
  radius: number;
  children: BranchNode[];
  hasLeaves: boolean;
  leafPositions: THREE.Vector3[];
  growthProgress: number;
  swayOffset: number;
  swayPhase: number;
  rotationAngle: number;
}

export interface PlantStructure {
  trunk: BranchNode;
  allNodes: BranchNode[];
  totalGrowthTime: number;
}

export interface SimParams {
  maxDepth: number;
  branchAngle: number;
  growthSpeed: number;
}

let nodeCounter = 0;

function createNodeId(): string {
  nodeCounter++;
  return `node_${nodeCounter}`;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generatePlantStructure(params: SimParams): PlantStructure {
  nodeCounter = 0;
  const allNodes: BranchNode[] = [];

  const seedPos = new THREE.Vector3(0, 0.3, 0);
  const trunkEnd = new THREE.Vector3(0, 1.2, 0);

  const trunk: BranchNode = {
    id: createNodeId(),
    depth: 0,
    startPos: seedPos.clone(),
    endPos: seedPos.clone(),
    targetEndPos: trunkEnd.clone(),
    radius: 0.18,
    children: [],
    hasLeaves: false,
    leafPositions: [],
    growthProgress: 0,
    swayOffset: randomRange(0, Math.PI * 2),
    swayPhase: randomRange(0.5, 1.5),
    rotationAngle: 0
  };
  allNodes.push(trunk);

  generateChildren(trunk, params, allNodes);

  const totalNodes = allNodes.length;
  const totalGrowthTime = (totalNodes * 0.5) / params.growthSpeed;

  return { trunk, allNodes, totalGrowthTime };
}

function generateChildren(
  parent: BranchNode,
  params: SimParams,
  allNodes: BranchNode[]
): void {
  if (parent.depth >= params.maxDepth) {
    parent.hasLeaves = true;
    const leafCount = parent.depth === params.maxDepth ? 5 : 3;
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2;
      const offset = new THREE.Vector3(
        Math.cos(angle) * 0.15,
        randomRange(0, 0.1),
        Math.sin(angle) * 0.15
      );
      parent.leafPositions.push(parent.targetEndPos.clone().add(offset));
    }
    return;
  }

  const branchCount = parent.depth === 0 ? 2 : 2;
  const parentDir = new THREE.Vector3()
    .subVectors(parent.targetEndPos, parent.startPos)
    .normalize();

  for (let i = 0; i < branchCount; i++) {
    const angleRad = (params.branchAngle * Math.PI) / 180;
    const rotationOffset = (i / branchCount) * Math.PI * 2 + parent.depth * 0.7;

    const lengthFactor = 0.7 + (params.maxDepth - parent.depth) * 0.05;
    const branchLength = parent.targetEndPos.distanceTo(parent.startPos) * lengthFactor;

    let branchDir = parentDir.clone();
    const up = new THREE.Vector3(0, 1, 0);
    const cross = new THREE.Vector3().crossVectors(branchDir, up).normalize();
    if (cross.length() < 0.01) {
      cross.set(1, 0, 0);
    }

    const quat1 = new THREE.Quaternion().setFromAxisAngle(cross, angleRad);
    const quat2 = new THREE.Quaternion().setFromAxisAngle(parentDir, rotationOffset);
    branchDir.applyQuaternion(quat1).applyQuaternion(quat2).normalize();

    const startPos = parent.targetEndPos.clone();
    const targetEndPos = startPos.clone().add(branchDir.multiplyScalar(branchLength));

    const child: BranchNode = {
      id: createNodeId(),
      depth: parent.depth + 1,
      startPos: startPos.clone(),
      endPos: startPos.clone(),
      targetEndPos: targetEndPos.clone(),
      radius: parent.radius * 0.65,
      children: [],
      hasLeaves: false,
      leafPositions: [],
      growthProgress: 0,
      swayOffset: randomRange(0, Math.PI * 2),
      swayPhase: randomRange(0.8, 1.2),
      rotationAngle: rotationOffset
    };

    parent.children.push(child);
    allNodes.push(child);

    generateChildren(child, params, allNodes);
  }
}

export interface GrowthState {
  currentTime: number;
  isPaused: boolean;
  isComplete: boolean;
}

export function updateGrowthAnimation(
  structure: PlantStructure,
  state: GrowthState,
  _deltaTime: number,
  currentTime: number,
  params: SimParams
): void {
  if (state.isPaused) return;

  const effectiveSpeed = params.growthSpeed;
  const segmentInterval = 0.5 / effectiveSpeed;

  structure.allNodes.forEach((node, index) => {
    const nodeStartTime = index * segmentInterval;

    if (currentTime >= nodeStartTime && !state.isComplete) {
      const nodeElapsed = currentTime - nodeStartTime;
      const nodeDuration = segmentInterval * 1.5;
      node.growthProgress = Math.min(1, nodeElapsed / nodeDuration);
    }

    const t = node.growthProgress;
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    node.endPos.lerpVectors(node.startPos, node.targetEndPos, easedT);

    if (t > 0) {
      const swayAmplitude = 0.05 * (1 + node.depth * 0.3);
      const swayFreq = 1.0 * node.swayPhase;
      const sway = Math.sin(currentTime * swayFreq * Math.PI * 2 + node.swayOffset) * swayAmplitude;

      node.endPos.x += sway * (1 + node.depth * 0.2);
      node.endPos.z += sway * 0.5 * (1 + node.depth * 0.2);
    }
  });

  const lastIndex = structure.allNodes.length - 1;
  const lastNode = structure.allNodes[lastIndex];
  if (lastNode && lastNode.growthProgress >= 1) {
    state.isComplete = true;
  }
}

export function calculateGrowthProgress(
  structure: PlantStructure,
  currentTime: number,
  _params: SimParams
): number {
  const totalDuration = structure.totalGrowthTime;
  if (totalDuration <= 0) return 0;
  return Math.min(1, currentTime / (totalDuration * 1.2));
}

export function resetGrowth(structure: PlantStructure): void {
  structure.allNodes.forEach((node) => {
    node.growthProgress = 0;
    node.endPos.copy(node.startPos);
  });
}
