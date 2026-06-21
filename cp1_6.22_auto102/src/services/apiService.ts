import { GraphNode, GraphLink, Conflict, ConflictRule } from '../types';

const API_BASE = '/api';

export const apiService = {
  async getNodes(): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
    try {
      const response = await fetch(`${API_BASE}/nodes`);
      if (!response.ok) throw new Error('Failed to fetch nodes');
      return response.json();
    } catch (error) {
      console.warn('Backend not available, using local data');
      return { nodes: [], links: [] };
    }
  },

  async saveNodes(nodes: GraphNode[], links: GraphLink[]): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${API_BASE}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, links }),
      });
      if (!response.ok) throw new Error('Failed to save nodes');
      return response.json();
    } catch (error) {
      console.warn('Backend not available, data not persisted');
      return { success: false };
    }
  },

  async addNode(node: Partial<GraphNode>): Promise<GraphNode> {
    try {
      const response = await fetch(`${API_BASE}/nodes/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node),
      });
      if (!response.ok) throw new Error('Failed to add node');
      return response.json();
    } catch (error) {
      console.warn('Backend not available, using local generation');
      throw error;
    }
  },

  async getConflicts(nodes: GraphNode[], links: GraphLink[]): Promise<{ conflicts: Conflict[]; rules: ConflictRule[] }> {
    try {
      const response = await fetch(`${API_BASE}/conflicts`);
      if (!response.ok) throw new Error('Failed to fetch conflicts');
      return response.json();
    } catch (error) {
      console.warn('Backend not available, using local conflict detection');
      const { detectConflicts, conflictRules } = await import('../utils/conflictDetector');
      return {
        conflicts: detectConflicts(nodes, links),
        rules: conflictRules,
      };
    }
  },

  async getConflictRules(): Promise<{ rules: ConflictRule[] }> {
    try {
      const response = await fetch(`${API_BASE}/conflicts/rules`);
      if (!response.ok) throw new Error('Failed to fetch rules');
      return response.json();
    } catch (error) {
      console.warn('Backend not available, using local rules');
      const { conflictRules } = await import('../utils/conflictDetector');
      return { rules: conflictRules };
    }
  },
};
