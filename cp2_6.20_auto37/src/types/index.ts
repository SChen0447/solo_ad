export type TopologyType = 'ring' | 'star' | 'tree' | 'mesh';

export interface TopologyNode {
  id: number;
  position: { x: number; y: number; z: number };
}

export interface TopologyEdge {
  source: number;
  target: number;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TopologyParams {
  nodeCount: number;
  connectionProbability?: number;
}

export type RoutingSpeed = 'slow' | 'medium' | 'fast';

export interface RoutingState {
  isActive: boolean;
  currentNodeIndex: number;
  path: number[];
  progress: number;
  packetPosition: { x: number; y: number; z: number };
}

export interface SelectedNodeInfo {
  id: number;
  position: { x: number; y: number; z: number };
  connectionCount: number;
}

export interface Particle {
  position: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
}
