export interface MindMapNode {
  id: string;
  text: string;
  parentId: string | null;
  children: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  level: number;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  points: number[];
}

export const COLOR_PALETTE = [
  '#e3f2fd',
  '#fce4ec',
  '#e8f5e9',
  '#fff3e0',
  '#f3e5f5',
  '#e0f7fa',
];

export const NODE_WIDTH = 150;
export const NODE_PADDING = 12;
export const LEVEL_GAP = 80;
export const NODE_GAP = 20;
export const FONT_SIZE = 14;
export const LINE_HEIGHT = 20;
