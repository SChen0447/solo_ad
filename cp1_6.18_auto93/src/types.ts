export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  borderRadius: number;
  shadowBlur: number;
  parentId: string | null;
  collapsed: boolean;
  width: number;
  height: number;
}

export interface CanvasState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  selectedNodeId: string | null;
  nodeSpacing: number;
  hoveredNodeId: string | null;
  editingNodeId: string | null;
}

export interface MindMapData {
  nodes: MindMapNode[];
  zoom: number;
  offsetX: number;
  offsetY: number;
  nodeSpacing: number;
  version: string;
}

export const MACARON_COLORS: string[] = [
  '#a8dadc',
  '#f4a6a6',
  '#b5ead7',
  '#ffdac1',
  '#c7ceea',
  '#ffb7b2',
  '#e2f0cb',
  '#f7dc6f',
  '#d4a5a5',
  '#aed6f1',
];

export const DEFAULT_COLOR = MACARON_COLORS[0];
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_BORDER_RADIUS = 12;
export const DEFAULT_SHADOW_BLUR = 4;
export const DEFAULT_NODE_SPACING = 80;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;
export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 32;
export const MIN_BORDER_RADIUS = 0;
export const MAX_BORDER_RADIUS = 20;
export const MIN_SHADOW_BLUR = 0;
export const MAX_SHADOW_BLUR = 10;
export const MIN_NODE_SPACING = 60;
export const MAX_NODE_SPACING = 120;
export const CENTER_NODE_RADIUS = 50;
export const CHILD_NODE_HEIGHT = 36;
export const CHILD_NODE_MIN_WIDTH = 80;
export const CHILD_NODE_PADDING_X = 20;
