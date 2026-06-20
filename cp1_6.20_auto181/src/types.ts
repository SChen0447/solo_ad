export type AnnotationType = 'arrow' | 'rect' | 'circle';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: AnnotationType;
  color: string;
  strokeWidth: number;
  startPoint: Point;
  endPoint: Point;
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
}

export interface RectShape extends BaseShape {
  type: 'rect';
}

export interface CircleShape extends BaseShape {
  type: 'circle';
}

export type CanvasElement = ArrowShape | RectShape | CircleShape;

export interface Annotation {
  id: string;
  element: CanvasElement;
  text: string;
  createdAt: number;
}

export interface Template {
  id: string;
  name: string;
  tags: string[];
  annotations: Annotation[];
  createdAt: number;
  updatedAt: number;
}

export interface HistoryState {
  annotations: Annotation[];
}

export type HistoryActionType = 'add' | 'delete' | 'modify';

export interface HistoryEntry {
  type: HistoryActionType;
  previous: HistoryState;
  next: HistoryState;
}

export interface SaveTemplateRequest {
  name: string;
  tags?: string[];
  annotations: Annotation[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;
export const DEFAULT_COLOR = '#FF3366';
export const DEFAULT_STROKE_WIDTH = 3;
export const MAX_HISTORY_STEPS = 20;
