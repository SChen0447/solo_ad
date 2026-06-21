import { Graph, alg } from 'graphlib';
import { v4 as uuidv4 } from 'uuid';
import type {
  ModuleNode,
  DependencyEdge,
  ProjectStructure,
  TopologyData,
  RiskData,
  HistoryRecord,
  RiskLevel,
  SimulateRemoveResponse,
} from './types/index.js';

const CHANGE_COUNT_WEIGHT = 0.4;
const DEPENDENCY_WEIGHT = 0.35;
const COUPLING_WEIGHT = 0.25;
const MAX_HISTORY_RECORDS = 20;

export class GraphEngine {
  private graph: Graph;
  private projectStructure: ProjectStructure | null = null;
  private historyRecords: HistoryRecord[] = [];
  private nodesMap: Map<string, ModuleNode> = new Map();
  private edgesMap: Map<string, DependencyEdge> = new Map();

  constructor() {
    this.graph = new Graph({ directed: true });
  }

  loadProject(structure: ProjectStructure): {
    topology: TopologyData;
    risks: RiskData[];
    history: HistoryRecord[];
  } {
    this.graph = new Graph({ directed: true });
    this.nodesMap.clear();
    this.edgesMap.clear();

    structure.modules.forEach((module) => {
      const enrichedModule = this.enrichModule(module);
      this.nodesMap.set(module.id, enrichedModule);
      this.graph.setNode(module.id, enrichedModule);
    });

    structure.dependencies.forEach((edge) => {
      this.edgesMap.set(edge.id, edge);
      this.graph.setEdge(edge.source, edge.target, edge);
    });

    this.calculateDegrees();
    this.calculateStabilityScores();

    const circularDependencies = this.detectCircularDependencies();

    this.projectStructure = structure;

    const topology: TopologyData = {
      nodes: Array.from(this.nodesMap.values()),
      edges: Array.from(this.edgesMap.values()),
      circularDependencies,
    };

    const risks = this.generateRiskData();
    this.addHistoryRecord(structure, risks);

    return { topology, risks, history: this.getRecentHistory(5) };
  }

  private enrichModule(module: ModuleNode): ModuleNode {
    return {
      ...module,
      inDegree: module.inDegree || 0,
      outDegree: module.outDegree || 0,
      stabilityScore: module.stabilityScore || 100,
      riskLevel: module.riskLevel || 'low',
      changeCount: module.changeCount || Math.floor(Math.random() * 20),
      files: module.files || [],
    };
  }

  private calculateDegrees(): void {
    this.nodesMap.forEach((_, nodeId) => {
      const inDegree = this.graph.inEdges(nodeId)?.length || 0;
      const outDegree = this.graph.outEdges(nodeId)?.length || 0;
      const module = this.nodesMap.get(nodeId);
      if (module) {
        module.inDegree = inDegree;
        module.outDegree = outDegree;
      }
    });
  }

  private calculateStabilityScores(): void {
    const maxChangeCount = Math.max(
      ...Array.from(this.nodesMap.values()).map((m) => m.changeCount),
      1
    );
    const maxDegree = Math.max(
      ...Array.from(this.nodesMap.values()).map((m) => m.inDegree + m.outDegree),
      1
    );

    this.nodesMap.forEach((module, nodeId) => {
      const inEdges = this.graph.inEdges(nodeId) || [];
      let dependencyChangeFrequency = 0;
      inEdges.forEach((edge) => {
        const sourceModule = this.nodesMap.get(edge.v);
        if (sourceModule) {
          dependencyChangeFrequency += sourceModule.changeCount;
        }
      });

      const maxDepChange = Math.max(
        ...Array.from(this.nodesMap.values()).map((_, id) => {
          const edges = this.graph.inEdges(id) || [];
          return edges.reduce((sum, e) => {
            const src = this.nodesMap.get(e.v);
            return sum + (src?.changeCount || 0);
          }, 0);
        }),
        1
      );

      const normalizedChangeCount = module.changeCount / maxChangeCount;
      const normalizedDepChange = dependencyChangeFrequency / maxDepChange;
      const couplingDegree = (module.inDegree + module.outDegree) / maxDegree;

      const stabilityScore = Math.round(
        100 -
          (CHANGE_COUNT_WEIGHT * normalizedChangeCount +
            DEPENDENCY_WEIGHT * normalizedDepChange +
            COUPLING_WEIGHT * couplingDegree) *
            100
      );

      module.stabilityScore = Math.max(0, Math.min(100, stabilityScore));
      module.riskLevel = this.getRiskLevel(module.stabilityScore);
    });
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 70) return 'low';
    if (score >= 40) return 'medium';
    return 'high';
  }

  private detectCircularDependencies(): string[][] {
    try {
      const isAcyclic = alg.isAcyclic(this.graph);
      if (isAcyclic) return [];

      const cycles: string[][] = [];
      const visited = new Set<string>();
      const recursionStack = new Set<string>();
      const path: string[] = [];

      const dfs = (nodeId: string) => {
        if (recursionStack.has(nodeId)) {
          const cycleStartIndex = path.indexOf(nodeId);
          if (cycleStartIndex !== -1) {
            const cycle = path.slice(cycleStartIndex);
            cycle.push(nodeId);
            cycles.push([...cycle]);
          }
          return;
        }

        if (visited.has(nodeId)) return;

        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const successors = this.graph.successors(nodeId) || [];
        for (const successor of successors) {
          dfs(successor);
        }

        path.pop();
        recursionStack.delete(nodeId);
      };

      this.nodesMap.forEach((_, nodeId) => {
        if (!visited.has(nodeId)) {
          dfs(nodeId);
        }
      });

      return cycles;
    } catch {
      return [];
    }
  }

  private generateRiskData(): RiskData[] {
    const risks: RiskData[] = [];

    this.nodesMap.forEach((module, nodeId) => {
      const inEdges = this.graph.inEdges(nodeId) || [];
      let dependencyChangeFrequency = 0;
      inEdges.forEach((edge) => {
        const sourceModule = this.nodesMap.get(edge.v);
        if (sourceModule) {
          dependencyChangeFrequency += sourceModule.changeCount;
        }
      });

      risks.push({
        moduleId: nodeId,
        moduleName: module.name,
        stabilityScore: module.stabilityScore,
        riskLevel: module.riskLevel,
        changeCount: module.changeCount,
        dependencyChangeFrequency,
      });
    });

    return risks.sort((a, b) => a.stabilityScore - b.stabilityScore);
  }

  private addHistoryRecord(
    structure: ProjectStructure,
    risks: RiskData[]
  ): void {
    const highRiskCount = risks.filter((r) => r.riskLevel === 'high').length;
    const mediumRiskCount = risks.filter((r) => r.riskLevel === 'medium').length;
    const lowRiskCount = risks.filter((r) => r.riskLevel === 'low').length;
    const averageStability =
      risks.reduce((sum, r) => sum + r.stabilityScore, 0) / risks.length;

    const record: HistoryRecord = {
      id: uuidv4(),
      timestamp: Date.now(),
      version: structure.version || `v${this.historyRecords.length + 1}`,
      averageStability: Math.round(averageStability * 10) / 10,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    };

    this.historyRecords.unshift(record);
    if (this.historyRecords.length > MAX_HISTORY_RECORDS) {
      this.historyRecords.pop();
    }
  }

  getRecentHistory(count: number): HistoryRecord[] {
    return this.historyRecords.slice(0, count).reverse();
  }

  getAffectedByRemoval(moduleId: string): SimulateRemoveResponse | null {
    if (!this.projectStructure) return null;

    const removedModule = this.nodesMap.get(moduleId);
    if (!removedModule) return null;

    const affectedModules = new Set<string>();
    const affectedEdges = new Set<string>();
    const impactPaths: string[][] = [];

    const findAllPaths = (
      start: string,
      end: string,
      visited: Set<string>,
      path: string[]
    ) => {
      if (start === end) {
        impactPaths.push([...path]);
        return;
      }

      const successors = this.graph.successors(start) || [];
      for (const successor of successors) {
        if (!visited.has(successor)) {
          visited.add(successor);
          path.push(successor);
          findAllPaths(successor, end, visited, path);
          path.pop();
          visited.delete(successor);
        }
      }
    };

    const visitDownstream = (nodeId: string, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      if (nodeId !== moduleId) {
        affectedModules.add(nodeId);
      }

      const outEdges = this.graph.outEdges(nodeId) || [];
      outEdges.forEach((edge) => {
        const edgeData = this.graph.edge(edge);
        if (edgeData) {
          affectedEdges.add(edgeData.id);
        }
        if (!visited.has(edge.w)) {
          findAllPaths(moduleId, edge.w, new Set([moduleId]), [moduleId]);
          visitDownstream(edge.w, visited);
        }
      });
    };

    const visitUpstream = (nodeId: string, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      if (nodeId !== moduleId) {
        affectedModules.add(nodeId);
      }

      const inEdges = this.graph.inEdges(nodeId) || [];
      inEdges.forEach((edge) => {
        const edgeData = this.graph.edge(edge);
        if (edgeData) {
          affectedEdges.add(edgeData.id);
        }
        if (!visited.has(edge.v)) {
          visitUpstream(edge.v, visited);
        }
      });
    };

    visitDownstream(moduleId, new Set([moduleId]));
    visitUpstream(moduleId, new Set([moduleId]));

    const affectedCount = affectedModules.size;
    const totalModules = this.nodesMap.size;
    const impactPercentage = Math.round((affectedCount / totalModules) * 100);

    let overallRiskLevel: RiskLevel = 'low';
    if (impactPercentage >= 50 || affectedCount >= 10) {
      overallRiskLevel = 'high';
    } else if (impactPercentage >= 20 || affectedCount >= 5) {
      overallRiskLevel = 'medium';
    }

    return {
      removedModule: moduleId,
      removedModuleName: removedModule.name,
      affectedModules: Array.from(affectedModules),
      affectedEdges: Array.from(affectedEdges),
      impactPaths: impactPaths.slice(0, 20),
      riskLevel: overallRiskLevel,
      affectedCount,
      totalModules,
      impactPercentage,
    };
  }

  getCurrentTopology(): TopologyData | null {
    if (!this.projectStructure) return null;

    return {
      nodes: Array.from(this.nodesMap.values()),
      edges: Array.from(this.edgesMap.values()),
      circularDependencies: this.detectCircularDependencies(),
    };
  }

  getCurrentRisks(): RiskData[] | null {
    if (!this.projectStructure) return null;
    return this.generateRiskData();
  }

  getModuleById(moduleId: string): ModuleNode | undefined {
    return this.nodesMap.get(moduleId);
  }

  hasProject(): boolean {
    return this.projectStructure !== null;
  }
}

export const graphEngine = new GraphEngine();
