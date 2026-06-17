export interface Annotation {
  id: string;
  x_ratio: number;
  y_ratio: number;
  width_ratio: number;
  height_ratio: number;
  comment: string;
  createdAt: number;
}

export interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface AnimationState {
  id: string;
  type: 'fadeIn' | 'pulse' | 'shrinkOut';
  startTime: number;
  duration: number;
  progress?: number;
}

export interface ExportData {
  imageName: string;
  viewCenterX_ratio: number;
  viewCenterY_ratio: number;
  zoomLevel: number;
  annotations: Annotation[];
  exportedAt: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DrawingState =
  | { isDrawing: false }
  | { isDrawing: true; startX: number; startY: number; currentX: number; currentY: number };
