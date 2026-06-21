export type RiskLevel = 'low' | 'medium' | 'high';

export interface ModuleNode {
  id: string;
  name: string;
  files: string[];
  inDegree: number;
  outDegree: number;
  stabilityScore: number;
  riskLevel: RiskLevel;
  changeCount: number;
  x?: number;
  y?: number;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  callFrequency: number;
  interfaces: string[];
}

export interface ProjectStructure {
  projectName: string;
  version?: string;
  modules: ModuleNode[];
  dependencies: DependencyEdge[];
}

export interface TopologyData {
  nodes: ModuleNode[];
  edges: DependencyEdge[];
  circularDependencies: string[][];
}

export interface RiskData {
  moduleId: string;
  moduleName: string;
  stabilityScore: number;
  riskLevel: RiskLevel;
  changeCount: number;
  dependencyChangeFrequency: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  version: string;
  averageStability: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

export interface SimulateRemoveRequest {
  moduleId: string;
}

export interface SimulateRemoveResponse {
  removedModule: string;
  removedModuleName: string;
  affectedModules: string[];
  affectedEdges: string[];
  impactPaths: string[][];
  riskLevel: RiskLevel;
  affectedCount: number;
  totalModules: number;
  impactPercentage: number;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  topology: TopologyData;
  risks: RiskData[];
  history: HistoryRecord[];
}
