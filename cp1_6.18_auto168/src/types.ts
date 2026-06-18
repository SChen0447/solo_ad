export type ToolType = 'select' | 'rectangle' | 'circle' | 'line' | 'pen' | 'sticky';

export interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface BaseElement {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'pen' | 'sticky';
  x: number;
  y: number;
  color: string;
  strokeWidth: number;
  createdAt: number;
  userId: string;
  opacity: number;
  isAnimating?: boolean;
  animationStart?: number;
  scale?: number;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radiusX: number;
  radiusY: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  x2: number;
  y2: number;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: { x: number; y: number }[];
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  width: number;
  height: number;
  text: string;
}

export type BoardElement = RectangleElement | CircleElement | LineElement | PenElement | StickyElement;

export type HistoryAction =
  | { type: 'add'; element: BoardElement }
  | { type: 'update'; id: string; before: Partial<BoardElement>; after: Partial<BoardElement> }
  | { type: 'delete'; element: BoardElement };

export interface SyncMessage {
  type: 'add' | 'update' | 'delete' | 'undo' | 'redo' | 'init' | 'user-join' | 'user-leave';
  payload: unknown;
  userId: string;
  timestamp: number;
}

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se'
  | null;
