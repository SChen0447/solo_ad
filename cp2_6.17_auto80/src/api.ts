import type { GraphNode, GraphEdge, GraphData, CreateNodeRequest, UpdateNodeRequest, CreateEdgeRequest } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  getNodes: (): Promise<GraphNode[]> => request<GraphNode[]>('/nodes'),

  getNode: (id: string): Promise<GraphNode> => request<GraphNode>(`/nodes/${id}`),

  createNode: (data: CreateNodeRequest): Promise<GraphNode> =>
    request<GraphNode>('/nodes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateNode: (id: string, data: UpdateNodeRequest): Promise<GraphNode> =>
    request<GraphNode>(`/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteNode: (id: string): Promise<GraphNode> =>
    request<GraphNode>(`/nodes/${id}`, {
      method: 'DELETE',
    }),

  getEdges: (): Promise<GraphEdge[]> => request<GraphEdge[]>('/edges'),

  createEdge: (data: CreateEdgeRequest): Promise<GraphEdge> =>
    request<GraphEdge>('/edges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteEdge: (id: string): Promise<GraphEdge> =>
    request<GraphEdge>(`/edges/${id}`, {
      method: 'DELETE',
    }),

  getGraph: (): Promise<GraphData> => request<GraphData>('/graph'),
};
