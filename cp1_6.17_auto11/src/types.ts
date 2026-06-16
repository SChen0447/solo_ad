export interface GraphNode {
  id: string;
  label: string;
  type: 'heading' | 'list-item' | 'code-block';
  depth: number;
  parentId: string | null;
  childIds: string[];
  markdown: string;
  tags: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  collapsed?: boolean;
  size?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'hierarchy' | 'manual';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
