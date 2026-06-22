export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  imageUrl: string | null;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count?: number;
}

export interface GraphNode {
  id: string;
  title: string;
  content: string;
  tags: string[];
  wordCount: number;
  imageUrl: string | null;
  createdAt: number;
  cluster: number;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  similarity: number;
  tagSimilarity: number;
  keywordSimilarity: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  tagClusters: string[];
}
