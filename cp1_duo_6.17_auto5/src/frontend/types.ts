export interface ConceptNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'circle' | 'rectangle';
  fillColor: string;
  borderColor: string;
  label: string;
  createdAt: number;
  createdBy: string;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  arrowType: 'none' | 'one-way' | 'two-way';
  createdAt: number;
  createdBy: string;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
  lastActive: number;
}

export interface RoomState {
  roomId: string;
  nodes: ConceptNode[];
  connections: Connection[];
  collaborators: Collaborator[];
}

export interface AnalysisResult {
  type: 'isolated' | 'cycle' | 'missing';
  severity: 'warning' | 'error';
  message: string;
  nodeIds: string[];
}

export interface NodeStyle {
  shape: 'circle' | 'rectangle';
  fillColor: string;
  borderColor: string;
  arrowType: 'none' | 'one-way' | 'two-way';
}

export const PRESET_COLORS: string[] = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
];

export const DEFAULT_NODE_STYLE: NodeStyle = {
  shape: 'rectangle',
  fillColor: '#45B7D1',
  borderColor: '#2D8B9E',
  arrowType: 'one-way',
};

export const CANVAS_CONFIG = {
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 5,
  GRID_SIZE: 20,
  GRID_COLOR: '#E0E0E0',
  BACKGROUND_COLOR: '#F0F0F0',
  NODE_WIDTH: 120,
  NODE_HEIGHT: 60,
};
