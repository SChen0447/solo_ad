import type { FabricObject, IText, Rect, Circle } from 'fabric';

export type CanvasElementType = 'text' | 'rect' | 'circle';

export interface TemplateData {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  data: {
    objects: any[];
    background: string;
  };
}

export interface SelectedObjectProps {
  id?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  fill: string | null;
  stroke: string | null;
  strokeWidth: number;
  type: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  textAlign?: string;
  rx?: number;
  ry?: number;
  radius?: number;
}

export type FabricObjectWithProps = FabricObject & Partial<SelectedObjectProps>;

export interface CanvasApi {
  addText: () => void;
  addRect: () => void;
  addCircle: () => void;
  deleteSelected: () => void;
  getSelectedObject: () => FabricObjectWithProps | null;
  updateObject: (props: Partial<SelectedObjectProps>) => void;
  toDataURL: () => string;
  loadFromJSON: (data: any) => Promise<void>;
  clear: () => void;
  getCanvasJSON: () => any;
  getFabricCanvas: () => any;
  setBackground: (color: string) => void;
}

export type HistoryState = {
  undoStack: string[];
  redoStack: string[];
  currentIndex: number;
};
