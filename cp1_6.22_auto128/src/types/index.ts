export type ComponentCategory = 'walls' | 'furniture' | 'plants' | 'decorations';

export interface GeometryConfig {
  type: 'box' | 'cylinder' | 'cone' | 'sphere';
  params: number[];
}

export interface MaterialConfig {
  color: string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
}

export interface ComponentConfig {
  id: string;
  name: string;
  category: ComponentCategory;
  geometry: GeometryConfig;
  material: MaterialConfig;
  thumbnailColor: string;
  gridSize: [number, number, number];
  shape2D?: 'rect' | 'circle' | 'line';
  lineHeight?: number;
}

export interface PlacedComponent {
  id: string;
  templateId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface LightConfig {
  sunPosition: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  shadowMapSize: number;
}

export interface LayoutData {
  components: PlacedComponent[];
  createdAt: number;
  version: string;
}

export interface SaveResponse {
  success: boolean;
  layoutId: string;
}

export interface LoadResponse {
  success: boolean;
  data?: LayoutData;
  error?: string;
}

export type HistoryAction = 'add' | 'delete' | 'move';

export interface HistoryEntry {
  action: HistoryAction;
  snapshot: PlacedComponent[];
}
