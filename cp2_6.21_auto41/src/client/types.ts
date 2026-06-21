export interface FilterParams {
  brightness: number;
  contrast: number;
  saturation: number;
  hueRotate: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  backgroundColor: string;
  backgroundOpacity: number;
}

export interface Layer {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
  imageUrl?: string;
  filters?: FilterParams;
  text?: string;
  textStyle?: TextStyle;
}

export interface CollageData {
  id?: string;
  name?: string;
  description?: string;
  author?: string;
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  background: string;
}

export interface CollageResponse {
  id: string;
  name: string;
  description: string;
  author: string;
  layers: Layer[];
  likes: number;
  createdAt: number;
  canvasWidth: number;
  canvasHeight: number;
  background: string;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const CANVAS_BG = '#F5F0E8';

export const FONT_FAMILIES = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Oswald',
  'Raleway',
  'Merriweather',
  'Pacifico',
];

export const DEFAULT_FILTERS: FilterParams = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hueRotate: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Roboto',
  fontSize: 32,
  color: '#1A1A2E',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  backgroundColor: 'transparent',
  backgroundOpacity: 0,
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function buildFilterCSS(filters: FilterParams): string {
  const parts: string[] = [];
  if (filters.brightness !== 0) {
    parts.push(`brightness(${100 + filters.brightness}%)`);
  }
  if (filters.contrast !== 0) {
    parts.push(`contrast(${100 + filters.contrast}%)`);
  }
  if (filters.saturation !== 0) {
    parts.push(`saturate(${100 + filters.saturation}%)`);
  }
  if (filters.hueRotate !== 0) {
    parts.push(`hue-rotate(${filters.hueRotate}deg)`);
  }
  return parts.length ? parts.join(' ') : 'none';
}
