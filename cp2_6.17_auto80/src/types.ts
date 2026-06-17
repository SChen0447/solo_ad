export interface GraphNode {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CreateNodeRequest {
  name: string;
  label: string;
  x?: number;
  y?: number;
}

export interface UpdateNodeRequest {
  name?: string;
  label?: string;
  x?: number;
  y?: number;
}

export interface CreateEdgeRequest {
  source: string;
  target: string;
}
