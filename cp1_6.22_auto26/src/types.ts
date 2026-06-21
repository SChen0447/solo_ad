export interface Screenshot {
  id: string;
  dataUrl: string;
  timestamp: number;
  number: number;
  width: number;
  height: number;
}

export interface CompareState {
  topImage: Screenshot | null;
  bottomImage: Screenshot | null;
  mode: 'split-vertical' | 'split-horizontal' | 'overlay' | 'difference';
  splitPosition: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationTool = 'pen' | 'highlighter' | 'arrow' | 'text';

export interface AnnotationElement {
  id: string;
  type: AnnotationTool;
  x: number;
  y: number;
  color?: string;
  size?: number;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  points?: { x: number; y: number }[];
}
