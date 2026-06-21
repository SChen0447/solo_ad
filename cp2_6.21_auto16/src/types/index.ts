export type ToolType = 'select' | 'pen' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'icon';

export interface BaseElement {
  id: string;
  type: 'pen' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'icon';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  fill?: string;
  strokeWidth: number;
  createdAt: number;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: { x: number; y: number }[];
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  content: string;
  fill: string;
}

export interface IconElement extends BaseElement {
  type: 'icon';
  iconName: string;
}

export type CanvasElement =
  | BaseElement
  | PenElement
  | TextElement
  | StickyElement
  | IconElement;

export const GRID_SIZE = 50;
export const SNAP_THRESHOLD = 10;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const MAX_HISTORY = 50;
export const ZOOM_TRANSITION_MS = 150;
