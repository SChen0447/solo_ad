export interface Point {
  x: number;
  y: number;
}

export interface Region {
  id: string;
  colorIndex: number;
  pixels: Point[];
  boundary: Point[];
  centroid: Point;
  labelPosition: Point;
}

export interface ColorInfo {
  index: number;
  rgb: [number, number, number];
  hex: string;
  count: number;
}

export interface ProcessedImageData {
  width: number;
  height: number;
  originalImageData: ImageData;
  lineArtImageData: ImageData;
  regions: Region[];
  colorPalette: ColorInfo[];
  regionMap: Int32Array;
}

export interface FilledRegion {
  regionId: string;
  colorIndex: number;
  timestamp: number;
}

export interface ProgressSnapshot {
  filledRegions: FilledRegion[];
  processedImage: ProcessedImageData | null;
  displayMode: DisplayMode;
  selectedColorIndex: number | null;
  timestamp: number;
}

export type DisplayMode = 'original' | 'lineart' | 'filled';
