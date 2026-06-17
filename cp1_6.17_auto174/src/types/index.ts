export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  children: string[];
  collapsed: boolean;
  level: number;
  width: number;
  height: number;
}

export interface MindMapState {
  nodes: Record<string, MindMapNode>;
  rootIds: string[];
  selectedNodeId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface HistoryState {
  past: MindMapState[];
  present: MindMapState;
  future: MindMapState[];
}

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 60;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2;
export const MAX_HISTORY = 50;

export const LEVEL_COLORS = [
  '#2C3E50',
  '#34495E',
  '#5D6D7E',
  '#85929E',
  '#AEB6BF',
  '#D5D8DC',
  '#ECF0F1',
];

export function getLevelColor(level: number): string {
  const index = Math.min(level, LEVEL_COLORS.length - 1);
  return LEVEL_COLORS[index];
}

export function getLineWidth(level: number): number {
  return Math.max(1, 3 - level * 0.5);
}

export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
