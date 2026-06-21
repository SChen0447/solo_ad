export interface PixelColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type PixelGrid = (PixelColor | null)[][];

export interface PaletteColor {
  hex: string;
  rgb: PixelColor;
  group: 'warm' | 'cool' | 'earth' | 'metal';
}

export type ToolType = 'pencil' | 'bucket' | 'eyedropper' | 'eraser';

export interface Template {
  id: string;
  name: string;
  grid: PixelGrid;
  recommendedPalette: string[];
}

export interface GeneratedTexture {
  sourceCanvas: HTMLCanvasElement;
  textureCanvas: HTMLCanvasElement;
  previewCanvas: HTMLCanvasElement;
}

export interface EditorOptions {
  width: number;
  height: number;
  scale: number;
}

export interface HighlightPixel {
  x: number;
  y: number;
  startTime: number;
}
