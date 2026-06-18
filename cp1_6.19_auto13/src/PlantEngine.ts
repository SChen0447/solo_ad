import type {
  Branch,
  Leaf,
  EnvironmentParams,
  PlantState,
  Obstacle,
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_HEIGHT,
  COLOR_LIGHT_YELLOW,
  COLOR_DARK_GREEN,
} from './types';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function interpolateColor(
  t: number,
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * clampedT),
    g: Math.round(c1.g + (c2.g - c1.g) * clampedT),
    b: Math.round(c1.b + (c2.b - c1.b) * clampedT),
  };
}

function rgbToString(color: { r: number; g: number; b: number }): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function createLeaf(x: number, y: number, angle: number, color: string): Leaf {
  return {
    x,
    y,
    angle,
    radius: 8,
    color,
  };
}

function createBranch(
  level: number,
  startX: number,
  startY: number,
  length: number,
  angle: number,
  thickness: number,
  parentId: string | null,
  leafColor: string
): Branch {
  const id = generateId();
  const endX = startX + Math.cos(angle) * length;
  const endY = startY + Math.sin(angle) * length;

  const leaves: Leaf[] = [];
  if (level >= 2) {
    const leafCount = level === 2 ? 2 : 1;
    for (let i = 0; i < leafCount; i++) {
      const leafAngle = angle + (i === 0 ? -Math.PI / 4 : Math.PI / 4);
      const leafX = endX + Math.cos(leafAngle) * 5;
      const leafY = endY + Math.sin(leafAngle) * 5;
      leaves.push(createLeaf(leafX, leafY, leafAngle, leafColor));
    }
  }

  return {
    id,
    level,
    startX,
    startY,
    length,
    targetLength: length,
    angle,
    targetAngle: angle,
    thickness,
    leaves,
    children: [],
    parentId,
  };
}

export class PlantEngine {
  private trunk: Branch;
  private allBranches: Branch[] = [];
  private allLeaves: Leaf[] = [];
  private growthRate: number = 0;
  private fps: number = 60;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private animationStartTime: number = 0;
  private previousParams: EnvironmentParams;
  private time: number = 0;

  constructor() {
    this.previousParams = {
      light: 50,
      moisture: 60,
      temperature: 20,
    };

    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT - GROUND_HEIGHT;
    const initialAngle = -Math.PI / 2;

    this.trunk = createBranch(
      1,
      startX,
      startY,
      30,
      initialAngle,
      4,
      null,
      rgbToString(interpolateColor(0.5, COLOR_LIGHT_YELLOW, COLOR_DARK_GREEN))
    );

    const endX = startX + Math.cos(initialAngle) * 30;
    const endY = startY + Math.sin(initialAngle) * 30;

    this.trunk.leaves = [
      createLeaf(
        endX + Math.cos(initialAngle - Math.PI / 4) * 5,
        endY + Math.sin(initialAngle - Math.PI / 4) * 5,
        initialAngle - Math.PI / 4,
        rgbToString(interpolateColor(0.5, COLOR_LIGHT_YELLOW, COLOR_DARK_GREEN))
      ),
      createLeaf(
        endX + Math.cos(initialAngle + Math.PI / 4) * 5,
        endY + Math.sin(initialAngle + Math.PI / 4) * 5,
        initialAngle + Math.PI / 4,
        rgbToString(interpolateColor(0.5, COLOR_LIGHT_YELLOW, COLOR_DARK_GREEN))
      ),
    ];

    this.allBranches = [this.trunk];
    this.allLeaves = [...this.trunk.leaves];
  }

  getPlantState(): PlantState {
    const leafColor = this.calculateLeafColor(this.previousParams.temperature);
    return {
      trunk: this.trunk,
      allBranches: this.allBranches,
      allLeaves: this.allLeaves,
      growthRate: this.growthRate,
      totalBranches: this.allBranches.length,
      leafColor,
      fps: this.fps,
    };
  }

  private calculateLeafColor(temperature: number): {
    r: number;
    g: number;
    b: number;
  } {
    const t = (temperature + 5) / 50;
    return interpolateColor(t, COLOR_LIGHT_YELLOW, COLOR_DARK_GREEN);
  }

  private calculateGrowthRate(params: EnvironmentParams): number {
    const lightFactor = params.light / 100;
    const moistureFactor = params.moisture / 100;
    const tempOptimal = 20;
    const tempFactor = Math.max(
      0,
      1 - Math.abs(params.temperature - tempOptimal) / 30
    );
    return 0.5 * lightFactor * moistureFactor * tempFactor;
  }

  private calculateLightAtPoint(
    x: number,
    y: number,
    baseLight: number,
    obstacles: Obstacle[]
  ): number {
    let light = baseLight;
    for (const obstacle of obstacles) {
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < obstacle.radius) {
        const shadowIntensity = 1 - distance / obstacle.radius;
        light -= 50 * shadowIntensity;
      }
    }
    return Math.max(0, Math.min(100, light));
  }

  private calculateBendDirection(
    branch: Branch,
    params: EnvironmentParams,
    obstacles: Obstacle[]
  ): number {
    const endX = branch.startX + Math.cos(branch.angle) * branch.length;
    const endY = branch.startY + Math.sin(branch.angle) * branch.length;

    let leftLight = this.calculateLightAtPoint(
      endX - 20,
      endY,
      params.light,
      obstacles
    );
    let rightLight = this.calculateLightAtPoint(
      endX + 20,
      endY,
      params.light,
      obstacles
    );

    for (const obstacle of obstacles) {
      const dx = obstacle.x - endX;
      const dy = obstacle.y - endY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < obstacle.radius + 30) {
        const avoidAngle = Math.atan2(-dy, -dx);
        return avoidAngle;
      }
    }

    if (leftLight > rightLight) {
      return branch.angle - 0.3 * (Math.PI / 180);
    } else if (rightLight > leftLight) {
      return branch.angle + 0.3 * (Math.PI / 180);
    }

    return branch.angle;
  }

  private updateBranch(
    branch: Branch,
    params: EnvironmentParams,
    obstacles: Obstacle[],
    progress: number,
    leafColorStr: string
  ): void {
    const easedProgress = easeInOutCubic(Math.min(1, progress));

    branch.length +=
      (branch.targetLength - branch.length) * easedProgress * 0.05;

    const lightAmplitude = (params.light / 100) * 30 * (Math.PI / 180);
    const waveOffset =
      Math.sin(this.time * 0.05 + branch.level * 0.5) * lightAmplitude;
    const bendDirection = this.calculateBendDirection(branch, params, obstacles);
    branch.targetAngle = bendDirection + waveOffset;

    branch.angle +=
      (branch.targetAngle - branch.angle) * easedProgress * 0.03;

    const targetThickness = 4 + (params.moisture / 100) * 6;
    branch.thickness += (targetThickness - branch.thickness) * 0.02;

    const endX = branch.startX + Math.cos(branch.angle) * branch.length;
    const endY = branch.startY + Math.sin(branch.angle) * branch.length;

    branch.leaves.forEach((leaf, index) => {
      const leafBaseAngle =
        branch.angle + (index === 0 ? -Math.PI / 4 : Math.PI / 4);
      const lightTilt = ((params.light - 50) / 50) * 0.2;
      leaf.angle = leafBaseAngle + lightTilt;
      leaf.x = endX + Math.cos(leaf.angle) * 5;
      leaf.y = endY + Math.sin(leaf.angle) * 5;
      leaf.color = leafColorStr;
    });

    const targetBranchCount = Math.floor((params.moisture / 100) * 5);
    if (
      branch.level < 5 &&
      branch.children.length < targetBranchCount &&
      branch.length > 40
    ) {
      const newLevel = branch.level + 1;
      const childAngle =
        branch.angle +
        (branch.children.length === 0 ? -Math.PI / 6 : Math.PI / 6);
      const childLength = branch.length * 0.6;
      const childThickness = branch.thickness * 0.7;

      const child = createBranch(
        newLevel,
        endX,
        endY,
        childLength,
        childAngle,
        childThickness,
        branch.id,
        leafColorStr
      );
      branch.children.push(child);
      this.allBranches.push(child);
      this.allLeaves.push(...child.leaves);
    }

    branch.children.forEach((child) => {
      child.startX = endX;
      child.startY = endY;
      this.updateBranch(child, params, obstacles, progress, leafColorStr);
    });
  }

  updatePlant(
    params: EnvironmentParams,
    obstacles: Obstacle[],
    timestamp: number
  ): PlantState {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
      this.fpsUpdateTime = timestamp;
    }

    this.frameCount++;
    const elapsed = timestamp - this.fpsUpdateTime;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.fpsUpdateTime = timestamp;
    }

    const paramsChanged =
      params.light !== this.previousParams.light ||
      params.moisture !== this.previousParams.moisture ||
      params.temperature !== this.previousParams.temperature;

    if (paramsChanged) {
      this.animationStartTime = timestamp;
      this.previousParams = { ...params };
    }

    const animationProgress = Math.min(
      1,
      (timestamp - this.animationStartTime) / 500
    );

    this.growthRate = this.calculateGrowthRate(params);

    this.trunk.targetLength = 30 + (params.light / 100) * 120;

    const leafColor = this.calculateLeafColor(params.temperature);
    const leafColorStr = rgbToString(leafColor);

    this.time++;

    this.updateBranch(
      this.trunk,
      params,
      obstacles,
      animationProgress,
      leafColorStr
    );

    this.allLeaves = [];
    const collectLeaves = (branch: Branch) => {
      this.allLeaves.push(...branch.leaves);
      branch.children.forEach(collectLeaves);
    };
    collectLeaves(this.trunk);

    this.lastFrameTime = timestamp;

    return {
      trunk: this.trunk,
      allBranches: this.allBranches,
      allLeaves: this.allLeaves,
      growthRate: this.growthRate,
      totalBranches: this.allBranches.length,
      leafColor,
      fps: this.fps,
    };
  }

  addObstacle(x: number, y: number, radius: number): Obstacle {
    return {
      id: generateId(),
      x,
      y,
      radius,
      opacity: 0,
      createdAt: performance.now(),
    };
  }
}
