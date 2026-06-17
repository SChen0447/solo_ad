export type ElementType = 'image' | 'text' | 'drawing';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  points: Point[];
  strokeColor: string;
  strokeWidth: 2 | 4 | 6;
}

export type CanvasElement = ImageElement | TextElement | DrawingElement;

export interface CanvasView {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  elementId: string | null;
}

export type Tool = 'select' | 'image' | 'text' | 'drawing';

export const BRUSH_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ffffff'] as const;
export const BRUSH_WIDTHS = [2, 4, 6] as const;
