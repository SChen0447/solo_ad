export interface SpeciesSummary {
  id: string;
  name: string;
  nameEn: string;
  thumbnail: string;
  description: string;
}

export interface LSystemRule {
  symbol: string;
  replacement: string;
}

export interface LSystemConfig {
  axiom: string;
  rules: LSystemRule[];
  angle: number;
  iterations: number;
}

export interface BranchDef {
  angle: number;
  length: number;
  depth: number;
}

export interface LeafDef {
  color: string;
  shape: string;
  size: number;
  density: number;
}

export interface GrowthRate {
  maxHeight: number;
  maxCrownWidth: number;
  yearsToMature: number;
}

export interface SeasonColors {
  spring: string;
  summer: string;
  autumn: string;
  winter: string;
}

export interface SpeciesDetail {
  id: string;
  name: string;
  nameEn: string;
  thumbnail: string;
  description: string;
  lsystem: LSystemConfig;
  branches: BranchDef[];
  leaves: LeafDef;
  growthRate: GrowthRate;
  seasonColors: SeasonColors;
}

export interface LSystemParams {
  branchAngle: number;
  branchDepth: number;
  branchLengthScale: number;
}

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface BranchNode {
  position: [number, number, number];
  direction: [number, number, number];
  length: number;
  thickness: number;
  depth: number;
}

export interface LeafNode {
  position: [number, number, number];
  size: number;
  color: string;
}

export interface TreeMeshData {
  branches: BranchNode[];
  leaves: LeafNode[];
  trunkHeight: number;
  crownWidth: number;
}
