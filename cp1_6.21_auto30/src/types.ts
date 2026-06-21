export interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  stroke: boolean;
  strokeColor: string;
  strokeWidth: number;
}

export interface TextElement {
  id: string;
  type: 'text';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: TextStyle;
}

export interface ImageElement {
  id: string;
  type: 'image';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string | null;
  rotation: number;
  scale: number;
}

export interface BackgroundStyle {
  type: 'solid' | 'gradient';
  color1: string;
  color2?: string;
  angle?: number;
}

export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  canvasWidth: number;
  canvasHeight: number;
  background: BackgroundStyle;
  elements: (TextElement | ImageElement)[];
}

export type PosterElement = TextElement | ImageElement;

export interface ExportSize {
  width: number;
  height: number;
  label: string;
}
