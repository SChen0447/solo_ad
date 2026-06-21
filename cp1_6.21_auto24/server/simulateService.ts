import { graphEngine } from './graphEngine.js';
import type { SimulateRemoveResponse } from './types/index.js';

export class SimulateService {
  simulateModuleRemoval(
    moduleId: string
  ): { success: boolean; data?: SimulateRemoveResponse; error?: string } {
    if (!graphEngine.hasProject()) {
      return {
        success: false,
        error: 'No project loaded. Please upload a project structure first.',
      };
    }

    const result = graphEngine.getAffectedByRemoval(moduleId);

    if (!result) {
      return {
        success: false,
        error: `Module with id '${moduleId}' not found.`,
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  getAllModules(): { success: boolean; data?: string[]; error?: string } {
    if (!graphEngine.hasProject()) {
      return {
        success: false,
        error: 'No project loaded.',
      };
    }

    const topology = graphEngine.getCurrentTopology();
    if (!topology) {
      return {
        success: false,
        error: 'Failed to get topology data.',
      };
    }

    return {
      success: true,
      data: topology.nodes.map((n) => n.id),
    };
  }
}

export const simulateService = new SimulateService();
