import type { SpeciesDetail, LSystemParams, TreeMeshData, Season } from "../types";

function generateLSystemString(
  axiom: string,
  rules: { symbol: string; replacement: string }[],
  iterations: number
): string {
  let current = axiom;
  const ruleMap = new Map(rules.map((r) => [r.symbol, r.replacement]));
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of current) {
      next += ruleMap.get(ch) ?? ch;
    }
    current = next;
    if (current.length > 50000) break;
  }
  return current;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

interface TurtleState {
  x: number;
  y: number;
  z: number;
  angleX: number;
  angleY: number;
  angleZ: number;
}

export function generateTreeMesh(
  species: SpeciesDetail,
  growthStep: number,
  params: LSystemParams,
  season: Season
): TreeMeshData {
  const growthFactor = growthStep / 100;
  const trunkHeight = 0.5 + (species.growthRate.maxHeight - 0.5) * growthFactor;
  const crownWidth = 0.3 + (species.growthRate.maxCrownWidth - 0.3) * growthFactor;

  const effectiveAngle = params.branchAngle;
  const effectiveDepth = params.branchDepth;
  const effectiveScale = params.branchLengthScale;

  const lStr = generateLSystemString(
    species.lsystem.axiom,
    species.lsystem.rules,
    Math.min(effectiveDepth, species.lsystem.iterations)
  );

  const branches: TreeMeshData["branches"] = [];
  const leaves: TreeMeshData["leaves"] = [];

  const stack: TurtleState[] = [];
  const turtle: TurtleState = {
    x: 0,
    y: 0,
    z: 0,
    angleX: 0,
    angleY: 0,
    angleZ: 90,
  };

  const baseLength = trunkHeight / (effectiveDepth + 1);
  let currentDepth = 0;

  const seasonColor = species.seasonColors[season];

  for (let i = 0; i < lStr.length; i++) {
    const ch = lStr[i];

    if (ch === "F") {
      const len =
        baseLength * effectiveScale * Math.pow(0.7, currentDepth) * (0.8 + growthFactor * 0.4);
      const radZ = degToRad(turtle.angleZ);
      const radX = degToRad(turtle.angleX);

      const dx = Math.cos(radZ) * Math.cos(radX) * len;
      const dy = Math.sin(radZ) * len;
      const dz = Math.cos(radZ) * Math.sin(radX) * len;

      const nx = turtle.x + dx;
      const ny = turtle.y + dy;
      const nz = turtle.z + dz;

      const thickness = Math.max(0.02, 0.15 * Math.pow(0.6, currentDepth) * (0.5 + growthFactor * 0.5));

      branches.push({
        position: [turtle.x, turtle.y, turtle.z],
        direction: [dx, dy, dz],
        length: len,
        thickness,
        depth: currentDepth,
      });

      if (currentDepth >= effectiveDepth - 1 && growthFactor > 0.1) {
        const leafCount = Math.floor(species.leaves.density * 3 * growthFactor);
        for (let j = 0; j < leafCount; j++) {
          const spread = crownWidth * 0.15;
          leaves.push({
            position: [
              nx + (Math.random() - 0.5) * spread,
              ny + (Math.random() - 0.5) * spread * 0.5,
              nz + (Math.random() - 0.5) * spread,
            ],
            size: species.leaves.size * (0.5 + growthFactor * 0.5),
            color: seasonColor,
          });
        }
      }

      turtle.x = nx;
      turtle.y = ny;
      turtle.z = nz;
    } else if (ch === "+") {
      turtle.angleZ += effectiveAngle * (0.8 + Math.random() * 0.4);
    } else if (ch === "-") {
      turtle.angleZ -= effectiveAngle * (0.8 + Math.random() * 0.4);
    } else if (ch === "[") {
      stack.push({ ...turtle });
      currentDepth++;
    } else if (ch === "]") {
      const prev = stack.pop();
      if (prev) {
        turtle.x = prev.x;
        turtle.y = prev.y;
        turtle.z = prev.z;
        turtle.angleX = prev.angleX;
        turtle.angleY = prev.angleY;
        turtle.angleZ = prev.angleZ;
      }
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return {
    branches,
    leaves,
    trunkHeight,
    crownWidth,
  };
}

export function getGrowthMarkers(growthStep: number): number[] {
  const markers: number[] = [];
  for (let step = 10; step <= growthStep; step += 10) {
    markers.push(step);
  }
  return markers;
}

export function interpolateSeasonColor(
  fromColor: string,
  toColor: string,
  t: number
): string {
  const from = hexToRgb(fromColor);
  const to = hexToRgb(toColor);
  if (!from || !to) return toColor;
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return `rgb(${r},${g},${b})`;
}

export function getSeasonBgColor(season: Season): string {
  switch (season) {
    case "spring":
      return "#E8F5E9";
    case "summer":
      return "#87CEEB";
    case "autumn":
      return "#FFF3E0";
    case "winter":
      return "#E0E0E0";
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
