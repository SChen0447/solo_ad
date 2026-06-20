export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface ExtractedColor {
  hex: string;
  rgb: RGB;
  hsv: HSV;
  brightness: number;
  contrast: number;
  percentage: number;
}

export interface ColorExtractResult {
  colors: ExtractedColor[];
  dominant: ExtractedColor;
  averageBrightness: number;
  saturation: number;
  hueDistribution: number[];
}

export interface ThemeVariables {
  '--primary': string;
  '--primary-light': string;
  '--primary-dark': string;
  '--secondary': string;
  '--secondary-light': string;
  '--accent': string;
  '--background': string;
  '--surface': string;
  '--surface-hover': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--border': string;
  '--border-light': string;
  '--shadow-0': string;
  '--shadow-1': string;
  '--shadow-2': string;
  '--shadow-3': string;
  '--shadow-4': string;
  '--radius-sm': string;
  '--radius-md': string;
  '--radius-lg': string;
  '--font-family': string;
  [key: string]: string;
}

export interface ThemePackage {
  variables: ThemeVariables;
  cssString: string;
  scssString: string;
  tailwindConfig: string;
  colors: ExtractedColor[];
  timestamp: number;
  id: string;
}

export interface HistoryTheme {
  id: string;
  colors: ExtractedColor[];
  timestamp: number;
  thumbnail: string;
}

export type ExportFormat = 'css' | 'scss' | 'tailwind';

export interface WorkerMessage {
  type: 'extract';
  imageData: ImageData;
  k?: number;
}

export interface WorkerResult {
  type: 'success';
  result: ColorExtractResult;
}

export interface WorkerProgress {
  type: 'progress';
  progress: number;
}

export interface WorkerError {
  type: 'error';
  message: string;
}
