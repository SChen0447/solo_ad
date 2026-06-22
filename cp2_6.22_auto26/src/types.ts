export interface CanvasElement {
  id: string;
  type: 'sticky' | 'rectangle' | 'path';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  points: { x: number; y: number }[];
}

export interface HistorySnapshot {
  elements: CanvasElement[];
  actionType: 'add' | 'delete' | 'move' | 'edit';
  timestamp: number;
}

export interface CanvasState {
  elements: CanvasElement[];
  offset: { x: number; y: number };
  zoom: number;
  selectedId: string | null;
  dragging: boolean;
  drawing: boolean;
  tool: 'select' | 'sticky' | 'rectangle' | 'path';
  history: HistorySnapshot[];
  historyIndex: number;
  sidebarOpen: boolean;
}

export const DEFAULT_ELEMENT_PROPS: Omit<CanvasElement, 'id' | 'type' | 'x' | 'y' | 'points'> = {
  width: 240,
  height: 160,
  text: '',
  fill: '#FEF08A',
  stroke: '#EAB308',
  strokeWidth: 1,
  opacity: 1,
  points: [],
};

export function createStickyElement(id: string, x: number, y: number): CanvasElement {
  return {
    id,
    type: 'sticky',
    x,
    y,
    width: 240,
    height: 160,
    text: '双击编辑',
    fill: '#FEF08A',
    stroke: '#EAB308',
    strokeWidth: 0.5,
    opacity: 1,
    points: [],
  };
}

export function createRectangleElement(id: string, x: number, y: number): CanvasElement {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width: 200,
    height: 140,
    text: '',
    fill: '#DBEAFE',
    stroke: '#3B82F6',
    strokeWidth: 2,
    opacity: 1,
    points: [],
  };
}

export function createPathElement(id: string, points: { x: number; y: number }[]): CanvasElement {
  if (points.length === 0) {
    return {
      id,
      type: 'path',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      text: '',
      fill: 'none',
      stroke: '#6366F1',
      strokeWidth: 3,
      opacity: 0.85,
      points: [],
    };
  }
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    id,
    type: 'path',
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
    text: '',
    fill: 'none',
    stroke: '#6366F1',
    strokeWidth: 3,
    opacity: 0.85,
    points: points.map(p => ({ x: p.x - minX, y: p.y - minY })),
  };
}
