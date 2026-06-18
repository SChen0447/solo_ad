export type NodeType = 'start' | 'action' | 'decision' | 'end';

export interface NodeTemplate {
  type: NodeType;
  label: string;
  icon: string;
  defaultColor: string;
}

export interface JourneyNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  borderRadius: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  color: string;
  sourcePort: 'bottom' | 'right';
  targetPort: 'top' | 'left';
}

export interface CanvasState {
  nodes: JourneyNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  isDraggingNode: boolean;
  isDraggingCanvas: boolean;
  isConnecting: boolean;
  connectingSourceId: string | null;
  connectingSourcePort: 'bottom' | 'right' | null;
  tempConnectionEnd: { x: number; y: number } | null;
}

export interface Point {
  x: number;
  y: number;
}

export const GRID_SIZE = 20;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const NODE_DEFAULT_WIDTH = 160;
export const NODE_DEFAULT_HEIGHT = 80;
export const NODE_MIN_HEIGHT = 60;
export const NODE_MAX_HEIGHT = 120;
export const MIN_BORDER_RADIUS = 4;
export const MAX_BORDER_RADIUS = 20;
export const MIN_LINE_WIDTH = 1;
export const MAX_LINE_WIDTH = 4;
export const PALETTE_WIDTH = 220;
export const PROPERTY_PANEL_WIDTH = 240;

export const COLOR_PALETTE = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
];

export const NODE_TEMPLATES: NodeTemplate[] = [
  { type: 'start', label: '开始', icon: '▶', defaultColor: COLOR_PALETTE[3] },
  { type: 'action', label: '操作', icon: '⚡', defaultColor: COLOR_PALETTE[2] },
  { type: 'decision', label: '判断', icon: '◆', defaultColor: COLOR_PALETTE[4] },
  { type: 'end', label: '结束', icon: '⬛', defaultColor: COLOR_PALETTE[1] },
];
