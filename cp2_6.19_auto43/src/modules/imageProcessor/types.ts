export interface Point {
  x: number;
  y: number;
}

export interface ColorEntry {
  index: number;
  color: string;
  hex: string;
}

export interface FilledRegion {
  id: string;
  colorIndex: number;
  boundary: Point[];
  centerX: number;
  centerY: number;
  filled: boolean;
  filledColorIndex?: number;
  path2D?: Path2D;
}

export interface ProcessedImageData {
  width: number;
  height: number;
  originalImageData: ImageData;
  lineArtCanvas: HTMLCanvasElement;
  regions: FilledRegion[];
  colorPalette: ColorEntry[];
  pixelColorMap: number[][];
}

export interface ProgressSnapshot {
  imageHash: string;
  filledRegions: Record<string, number>;
  timestamp: number;
}

export type DisplayMode = 'original' | 'lineart' | 'colored';
