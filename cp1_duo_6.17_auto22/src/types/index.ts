export type ShapeType = 'square' | 'circle' | 'triangle' | 'cross' | 'star' | 'arrow' | 'heart' | 'diamond';
export type FillType = 'solid' | 'linear-gradient' | 'radial-gradient' | 'none';
export type CanvasBgType = 'transparent' | '#ffffff' | '#f0f0f0' | '#1e1e1e';

export interface GradientStop {
  offset: number;
  color: string;
}

export interface IconConfig {
  id: string;
  name: string;
  shape: ShapeType;
  strokeWidth: number;
  strokeColor: string;
  borderRadius: number;
  fillType: FillType;
  fillColor: string;
  gradientStops: GradientStop[];
  gradientAngle: number;
}

export interface Scheme {
  id: string;
  name: string;
  colorPreset: string;
  icons: IconConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface IconStoreState {
  currentConfig: IconConfig;
  iconCollection: IconConfig[];
  selectedIconId: string | null;
  canvasBg: CanvasBgType;
  schemes: Scheme[];
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  setCurrentConfig: (config: Partial<IconConfig>) => void;
  addToCollection: (icon: IconConfig) => void;
  removeFromCollection: (id: string) => void;
  selectIcon: (id: string | null) => void;
  setCanvasBg: (bg: CanvasBgType) => void;
  setSchemes: (schemes: Scheme[]) => void;
  loadScheme: (scheme: Scheme) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  resetCurrentConfig: () => void;
}

export const DEFAULT_ICON_CONFIG: IconConfig = {
  id: '',
  name: 'icon-' + Date.now(),
  shape: 'square',
  strokeWidth: 2,
  strokeColor: '#6c63ff',
  borderRadius: 4,
  fillType: 'none',
  fillColor: '#6c63ff',
  gradientStops: [
    { offset: 0, color: '#6c63ff' },
    { offset: 1, color: '#4A90D9' },
  ],
  gradientAngle: 45,
};

export const SHAPES: { type: ShapeType; name: string }[] = [
  { type: 'square', name: '正方形' },
  { type: 'circle', name: '圆形' },
  { type: 'triangle', name: '三角形' },
  { type: 'cross', name: '十字' },
  { type: 'star', name: '星形' },
  { type: 'arrow', name: '箭头' },
  { type: 'heart', name: '心形' },
  { type: 'diamond', name: '菱形' },
];
