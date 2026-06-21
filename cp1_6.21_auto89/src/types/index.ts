export type Importance = 'large' | 'medium' | 'small';

export interface GraphNode {
  id: string;
  title: string;
  summary: string;
  importance: Importance;
  position: [number, number, number];
  connections: string[];
}

export interface Template {
  id: string;
  name: string;
  color: string;
  nodes: GraphNode[];
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}
