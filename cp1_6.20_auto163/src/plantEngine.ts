export type PlantType = 'tree' | 'shrub' | 'grass';

export interface EnvironmentParams {
  light: number;
  moisture: number;
  temperature: number;
}

export interface PlantParams {
  branchAngle: number;
  internodeLength: number;
  leafCount: number;
  recursionDepth: number;
  thicknessRatio: number;
}

export interface PlantInstance {
  id: string;
  type: PlantType;
  position: [number, number, number];
  scale: number;
  rotation: number;
  params: PlantParams;
  baseParams: PlantParams;
  spawnDelay: number;
}

export interface SegmentData {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  level: number;
}

export interface LeafData {
  position: [number, number, number];
  direction: [number, number, number];
  size: number;
  level: number;
}

export interface PlantStructure {
  segments: SegmentData[];
  leaves: LeafData[];
  maxHeight: number;
  branchLevels: number;
}

export interface RenderData {
  stemPositions: Float32Array;
  stemNormals: Float32Array;
  stemColors: Float32Array;
  stemIndices: Uint32Array;
  leafPositions: Float32Array;
  leafNormals: Float32Array;
  leafColors: Float32Array;
  leafIndices: Uint32Array;
}

export const GROWTH_TOTAL_FRAMES = 60;

const DEG_TO_RAD = Math.PI / 180;

const DEFAULT_PLANT_PARAMS: Record<PlantType, PlantParams> = {
  tree: {
    branchAngle: 25,
    internodeLength: 1.2,
    leafCount: 5,
    recursionDepth: 4,
    thicknessRatio: 0.7,
  },
  shrub: {
    branchAngle: 40,
    internodeLength: 0.7,
    leafCount: 8,
    recursionDepth: 3,
    thicknessRatio: 0.65,
  },
  grass: {
    branchAngle: 15,
    internodeLength: 0.4,
    leafCount: 3,
    recursionDepth: 2,
    thicknessRatio: 0.8,
  },
};

const LSYSTEM_AXIOMS: Record<PlantType, string> = {
  tree: 'X',
  shrub: 'F',
  grass: 'F',
};

const LSYSTEM_RULES: Record<PlantType, Record<string, string>> = {
  tree: {
    X: 'F[-X][+X][&X][^X]F[X]',
    F: 'FF',
  },
  shrub: {
    F: 'F[+F][-F][&F][^F]F',
  },
  grass: {
    F: 'F[-F][+F]F&F^F',
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

const STEM_START = hexToRgb('#8B4513');
const STEM_END = hexToRgb('#5C3A21');
const LEAF_START = hexToRgb('#7CCD7C');
const LEAF_END = hexToRgb('#2E8B57');

export function getDefaultPlantParams(type: PlantType): PlantParams {
  return { ...DEFAULT_PLANT_PARAMS[type] };
}

export function applyEnvironmentToParams(
  base: PlantParams,
  env: EnvironmentParams,
  type: PlantType
): PlantParams {
  const lightFactor = (env.light - 0.2) / 1.3;
  const moistureFactor = env.moisture / 100;
  const tempOptimal = type === 'desert' ? 32 : type === 'tree' ? 20 : 18;
  const tempFactor = 1 - Math.min(Math.abs(env.temperature - tempOptimal) / 25, 1);

  const growthFactor = (lightFactor * 0.35 + moistureFactor * 0.4 + tempFactor * 0.25);
  const clampedGrowth = Math.max(0.3, Math.min(1.4, 0.6 + growthFactor * 0.8));

  return {
    branchAngle: base.branchAngle * (0.9 + lightFactor * 0.2),
    internodeLength: base.internodeLength * clampedGrowth,
    leafCount: Math.max(1, Math.round(base.leafCount * (0.5 + moistureFactor * 0.8))),
    recursionDepth: base.recursionDepth,
    thicknessRatio: base.thicknessRatio * (0.95 + tempFactor * 0.1),
  };
}

class TurtleState {
  pos: [number, number, number] = [0, 0, 0];
  heading: [number, number, number] = [0, 1, 0];
  left: [number, number, number] = [1, 0, 0];
  up: [number, number, number] = [0, 0, 1];
  level: number = 0;
}

function rotateAroundAxis(
  v: [number, number, number],
  axis: [number, number, number],
  angle: number
): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2];
  const crossX = axis[1] * v[2] - axis[2] * v[1];
  const crossY = axis[2] * v[0] - axis[0] * v[2];
  const crossZ = axis[0] * v[1] - axis[1] * v[0];

  return [
    v[0] * c + crossX * s + axis[0] * dot * (1 - c),
    v[1] * c + crossY * s + axis[1] * dot * (1 - c),
    v[2] * c + crossZ * s + axis[2] * dot * (1 - c),
  ];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-8) return [0, 1, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function expandLSystem(
  axiom: string,
  rules: Record<string, string>,
  depth: number
): string {
  let result = axiom;
  for (let i = 0; i < depth; i++) {
    let next = '';
    for (const ch of result) {
      next += rules[ch] || ch;
    }
    result = next;
  }
  return result;
}

export function generatePlantStructure(
  type: PlantType,
  params: PlantParams
): PlantStructure {
  const segments: SegmentData[] = [];
  const leaves: LeafData[] = [];
  let maxHeight = 0;
  let branchLevels = 0;

  const axiom = LSYSTEM_AXIOMS[type];
  const rules = LSYSTEM_RULES[type];
  const expanded = expandLSystem(axiom, rules, params.recursionDepth);

  const turtle = new TurtleState();
  const stack: TurtleState[] = [];
  const angleRad = params.branchAngle * DEG_TO_RAD;
  const initialRadius = type === 'tree' ? 0.25 : type === 'shrub' ? 0.12 : 0.06;

  for (const ch of expanded) {
    switch (ch) {
      case 'F': {
        const len = params.internodeLength;
        const start: [number, number, number] = [...turtle.pos];
        const end: [number, number, number] = [
          turtle.pos[0] + turtle.heading[0] * len,
          turtle.pos[1] + turtle.heading[1] * len,
          turtle.pos[2] + turtle.heading[2] * len,
        ];
        const radius = initialRadius * Math.pow(params.thicknessRatio, turtle.level);

        segments.push({
          start,
          end,
          radius,
          level: turtle.level,
        });

        turtle.pos = end;

        if (end[1] > maxHeight) maxHeight = end[1];
        if (turtle.level > branchLevels) branchLevels = turtle.level;

        if (turtle.level >= params.recursionDepth - 1 || type === 'grass') {
          const leafCount = params.leafCount;
          for (let i = 0; i < leafCount; i++) {
            const leafAngle = (i / leafCount) * Math.PI * 2;
            const leafDir: [number, number, number] = [
              Math.cos(leafAngle) * 0.6,
              0.7,
              Math.sin(leafAngle) * 0.6,
            ];
            const normalized = normalize(leafDir);
            leaves.push({
              position: [...end],
              direction: normalized,
              size: type === 'tree' ? 0.4 : type === 'shrub' ? 0.28 : 0.2,
              level: turtle.level,
            });
          }
        }
        break;
      }
      case '+':
        turtle.heading = normalize(rotateAroundAxis(turtle.heading, turtle.up, angleRad));
        turtle.left = normalize(rotateAroundAxis(turtle.left, turtle.up, angleRad));
        break;
      case '-':
        turtle.heading = normalize(rotateAroundAxis(turtle.heading, turtle.up, -angleRad));
        turtle.left = normalize(rotateAroundAxis(turtle.left, turtle.up, -angleRad));
        break;
      case '&':
        turtle.heading = normalize(rotateAroundAxis(turtle.heading, turtle.left, angleRad));
        turtle.up = normalize(rotateAroundAxis(turtle.up, turtle.left, angleRad));
        break;
      case '^':
        turtle.heading = normalize(rotateAroundAxis(turtle.heading, turtle.left, -angleRad));
        turtle.up = normalize(rotateAroundAxis(turtle.up, turtle.left, -angleRad));
        break;
      case '[': {
        const copy = new TurtleState();
        copy.pos = [...turtle.pos];
        copy.heading = [...turtle.heading];
        copy.left = [...turtle.left];
        copy.up = [...turtle.up];
        copy.level = turtle.level + 1;
        stack.push(copy);
        break;
      }
      case ']': {
        const popped = stack.pop();
        if (popped) {
          turtle.pos = popped.pos;
          turtle.heading = popped.heading;
          turtle.left = popped.left;
          turtle.up = popped.up;
          turtle.level = popped.level - 1;
        }
        break;
      }
      case 'X':
        break;
    }
  }

  return { segments, leaves, maxHeight, branchLevels };
}

const CYLINDER_SEGMENTS = 6;

export function buildRenderData(
  structure: PlantStructure,
  frame: number
): RenderData {
  const growthT = Math.max(0, Math.min(1, frame / GROWTH_TOTAL_FRAMES));
  const easedT = 1 - Math.pow(1 - growthT, 3);

  const stemPositions: number[] = [];
  const stemNormals: number[] = [];
  const stemColors: number[] = [];
  const stemIndices: number[] = [];
  const leafPositions: number[] = [];
  const leafNormals: number[] = [];
  const leafColors: number[] = [];
  const leafIndices: number[] = [];

  for (const seg of structure.segments) {
    const levelProgress = 1 - (seg.level / (structure.branchLevels + 1));
    const segStart = Math.min(1, levelProgress * 0.7);
    const segGrowth = Math.max(0, Math.min(1, (easedT - segStart) / (1 - segStart)));
    if (segGrowth <= 0) continue;

    const lerpedEnd: [number, number, number] = [
      lerp(seg.start[0], seg.end[0], segGrowth),
      lerp(seg.start[1], seg.end[1], segGrowth),
      lerp(seg.start[2], seg.end[2], segGrowth),
    ];

    const dir: [number, number, number] = normalize([
      lerpedEnd[0] - seg.start[0],
      lerpedEnd[1] - seg.start[1],
      lerpedEnd[2] - seg.start[2],
    ]);

    let perp1: [number, number, number] = [0, 0, 1];
    if (Math.abs(dir[1]) > 0.99) perp1 = [1, 0, 0];
    perp1 = normalize(cross(dir, perp1));
    const perp2 = normalize(cross(dir, perp1));

    const colorT = seg.level / Math.max(1, structure.branchLevels);
    const stemColor = lerpColor(STEM_START, STEM_END, 0.3 + colorT * 0.7);
    const r1 = seg.radius;
    const r2 = seg.radius * 0.85;
    const baseIdx = stemPositions.length / 3;

    for (let i = 0; i <= CYLINDER_SEGMENTS; i++) {
      const ang = (i / CYLINDER_SEGMENTS) * Math.PI * 2;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);

      const nx = perp1[0] * cosA + perp2[0] * sinA;
      const ny = perp1[1] * cosA + perp2[1] * sinA;
      const nz = perp1[2] * cosA + perp2[2] * sinA;

      stemPositions.push(seg.start[0] + nx * r1, seg.start[1] + ny * r1, seg.start[2] + nz * r1);
      stemNormals.push(nx, ny, nz);
      stemColors.push(stemColor[0], stemColor[1], stemColor[2]);

      stemPositions.push(lerpedEnd[0] + nx * r2, lerpedEnd[1] + ny * r2, lerpedEnd[2] + nz * r2);
      stemNormals.push(nx, ny, nz);
      stemColors.push(stemColor[0], stemColor[1], stemColor[2]);

      if (i < CYLINDER_SEGMENTS) {
        const i0 = baseIdx + i * 2;
        const i1 = i0 + 1;
        const i2 = i0 + 2;
        const i3 = i0 + 3;
        stemIndices.push(i0, i2, i1, i1, i2, i3);
      }
    }
  }

  for (const leaf of structure.leaves) {
    const leafStart = Math.min(1, 1 - (leaf.level / (structure.branchLevels + 1)) * 0.5 - 0.2);
    const leafGrowth = Math.max(0, Math.min(1, (easedT - leafStart) / (1 - leafStart)));
    if (leafGrowth <= 0) continue;

    const size = leaf.size * leafGrowth;
    const dir = leaf.direction;
    let perp: [number, number, number];
    if (Math.abs(dir[1]) > 0.9) perp = [1, 0, 0];
    else perp = normalize(cross(dir, [0, 1, 0]));
    const forward = normalize(cross(perp, dir));

    const baseIdx = leafPositions.length / 3;
    const pos = leaf.position;
    const s = size;

    const colorT = (leaf.level / Math.max(1, structure.branchLevels)) * 0.6 + growthT * 0.4;
    const leafColor = lerpColor(LEAF_START, LEAF_END, colorT);

    const v1: [number, number, number] = [
      pos[0] + perp[0] * s * 0.5,
      pos[1],
      pos[2] + perp[2] * s * 0.5,
    ];
    const v2: [number, number, number] = [
      pos[0] - perp[0] * s * 0.5,
      pos[1],
      pos[2] - perp[2] * s * 0.5,
    ];
    const v3: [number, number, number] = [
      pos[0] + dir[0] * s * 1.5 + forward[0] * s * 0.1,
      pos[1] + dir[1] * s * 1.5,
      pos[2] + dir[2] * s * 1.5 + forward[2] * s * 0.1,
    ];

    const n1 = normalize(cross(
      [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]],
      [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]]
    ));

    leafPositions.push(v1[0], v1[1], v1[2]);
    leafNormals.push(n1[0], n1[1], n1[2]);
    leafColors.push(leafColor[0], leafColor[1], leafColor[2]);

    leafPositions.push(v2[0], v2[1], v2[2]);
    leafNormals.push(n1[0], n1[1], n1[2]);
    leafColors.push(leafColor[0], leafColor[1], leafColor[2]);

    leafPositions.push(v3[0], v3[1], v3[2]);
    leafNormals.push(n1[0], n1[1], n1[2]);
    leafColors.push(leafColor[0] * 1.05, leafColor[1] * 1.05, leafColor[2] * 1.05);

    leafIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
  }

  return {
    stemPositions: new Float32Array(stemPositions),
    stemNormals: new Float32Array(stemNormals),
    stemColors: new Float32Array(stemColors),
    stemIndices: new Uint32Array(stemIndices),
    leafPositions: new Float32Array(leafPositions),
    leafNormals: new Float32Array(leafNormals),
    leafColors: new Float32Array(leafColors),
    leafIndices: new Uint32Array(leafIndices),
  };
}

function computeEnvScore(
  env: EnvironmentParams,
  type: PlantType,
  x: number,
  z: number
): number {
  const lightBase = 1 - ((x + 25) * 0.5 + (z + 25) * 0.5) / 50;
  const localLight = Math.max(0.2, Math.min(1.5, env.light * (0.6 + lightBase * 0.8)));

  const riverDist = Math.abs(x + z * 0.3);
  const moistureFactor = Math.max(0, 1 - riverDist / 35);
  const localMoisture = Math.max(0, Math.min(100, env.moisture * (0.3 + moistureFactor * 1.2)));

  const optimal: Record<PlantType, { l: number; m: number; t: number }> = {
    tree: { l: 0.9, m: 65, t: 20 },
    shrub: { l: 1.0, m: 50, t: 22 },
    grass: { l: 1.1, m: 40, t: 24 },
  };

  const opt = optimal[type];
  const lScore = 1 - Math.min(1, Math.abs(localLight - opt.l) / 1.0);
  const mScore = 1 - Math.min(1, Math.abs(localMoisture - opt.m) / 80);
  const tScore = 1 - Math.min(1, Math.abs(env.temperature - opt.t) / 30);

  return lScore * 0.3 + mScore * 0.45 + tScore * 0.25;
}

export interface DistributionOptions {
  minDistance?: number;
  plantCount?: number;
  distribution?: Record<PlantType, number>;
}

export function generatePlantDistribution(
  env: EnvironmentParams,
  options: DistributionOptions = {}
): PlantInstance[] {
  const {
    minDistance = 2,
    plantCount = 100,
    distribution = { tree: 0.3, shrub: 0.4, grass: 0.3 },
  } = options;

  const plants: PlantInstance[] = [];
  const gridSize = 50;
  const halfGrid = gridSize / 2;
  const cellSize = minDistance;
  const gridCols = Math.ceil(gridSize / cellSize);
  const occupied: Set<string> = new Set();

  const getCellKey = (x: number, z: number) => {
    const gx = Math.floor((x + halfGrid) / cellSize);
    const gz = Math.floor((z + halfGrid) / cellSize);
    return `${gx},${gz}`;
  };

  const hasNearby = (x: number, z: number) => {
    const gx = Math.floor((x + halfGrid) / cellSize);
    const gz = Math.floor((z + halfGrid) / cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (occupied.has(`${gx + dx},${gz + dz}`)) return true;
      }
    }
    return false;
  };

  const types: PlantType[] = ['tree', 'shrub', 'grass'];
  const typeThresholds: number[] = [
    distribution.tree,
    distribution.tree + distribution.shrub,
    1,
  ];

  let attemptCount = 0;
  const maxAttempts = plantCount * 80;

  while (plants.length < plantCount && attemptCount < maxAttempts) {
    attemptCount++;

    const x = (Math.random() - 0.5) * (gridSize - 4);
    const z = (Math.random() - 0.5) * (gridSize - 4);

    if (hasNearby(x, z)) continue;

    const r = Math.random();
    let selectedType: PlantType = 'grass';
    for (let i = 0; i < types.length; i++) {
      if (r <= typeThresholds[i]) {
        selectedType = types[i];
        break;
      }
    }

    const score = computeEnvScore(env, selectedType, x, z);
    if (score < 0.35 && Math.random() > score * 1.5) continue;

    const baseParams = getDefaultPlantParams(selectedType);
    const envParams = applyEnvironmentToParams(baseParams, env, selectedType);
    const scaleVariance = 0.7 + Math.random() * 0.6;
    const scoreBoost = 0.8 + score * 0.4;

    plants.push({
      id: `plant_${plants.length}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      type: selectedType,
      position: [x, 0, z],
      scale: scaleVariance * scoreBoost,
      rotation: Math.random() * Math.PI * 2,
      params: envParams,
      baseParams,
      spawnDelay: Math.random() * 0.5,
    });

    occupied.add(getCellKey(x, z));
  }

  return plants;
}

export function computePlantHeight(structure: PlantStructure, scale: number, frame: number): number {
  const growthT = Math.max(0, Math.min(1, frame / GROWTH_TOTAL_FRAMES));
  const easedT = 1 - Math.pow(1 - growthT, 3);
  return structure.maxHeight * scale * easedT;
}

export function computeEnvScoreForPlant(
  plant: PlantInstance,
  env: EnvironmentParams
): number {
  return computeEnvScore(env, plant.type, plant.position[0], plant.position[2]);
}
