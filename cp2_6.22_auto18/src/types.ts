export type ElementType = 'sticky' | 'rectangle' | 'path';

export type ActionType = 'add' | 'delete' | 'move' | 'modify';

export interface PathPoint {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  zIndex: number;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  width: number;
  height: number;
  text: string;
  backgroundColor: string;
  borderColor: string;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  width: number;
  height: number;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface PathElement extends BaseElement {
  type: 'path';
  points: PathPoint[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export type CanvasElement = StickyElement | RectangleElement | PathElement;

export interface HistoryEntry {
  id: string;
  action: ActionType;
  timestamp: number;
  elements: CanvasElement[];
  description: string;
}

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
}

export type ToolType = 'select' | 'sticky' | 'rectangle' | 'path';
