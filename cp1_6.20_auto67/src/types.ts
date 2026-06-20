export interface Shape {
  id: string;
  type: 'rect' | 'circle' | 'freehand' | 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  points?: { x: number; y: number }[];
  text?: string;
}

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  children: MindMapNode[];
  collapsed: boolean;
  shapeId: string;
  opacity: number;
}

export interface MindMapConnection {
  from: string;
  to: string;
  controlPoints: { x: number; y: number }[];
}

export interface MindMapData {
  root: MindMapNode;
  connections: MindMapConnection[];
}

export interface Operation {
  type: 'add' | 'move' | 'resize' | 'delete' | 'edit';
  shapeId: string;
  userId: string;
  timestamp: number;
  payload: Partial<Shape>;
}

export interface UserCursor {
  userId: string;
  color: string;
  selectedShapeId: string | null;
  displayName: string;
}

export type ToolType = 'select' | 'rect' | 'circle' | 'freehand' | 'sticky';
export type ModeType = 'canvas' | 'mindmap';

export const COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#4a90d9', '#9b59b6',
  '#e91e63', '#795548', '#607d8b', '#34495e',
];

export const STROKE_WIDTHS = [2, 4, 6, 8];

export const USER_COLORS = [
  '#e74c3c', '#2ecc71', '#3498db', '#9b59b6',
  '#e67e22', '#1abc9c', '#e91e63', '#f1c40f',
];
