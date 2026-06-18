export type Vec3 = [number, number, number];

export type FieldType = 'numeric' | 'categorical' | 'string';

export interface FieldInfo {
  name: string;
  type: FieldType;
  min?: number;
  max?: number;
  categories?: string[];
}

export interface Particle {
  id: string;
  index: number;
  rawData: Record<string, any>;
  targetPosition: Vec3;
  targetColor: string;
  targetSize: number;
  targetVisible: boolean;
  currentPosition: Vec3;
  currentColor: string;
  currentSize: number;
  currentAlpha: number;
  startPosition: Vec3;
  entryProgress: number;
  entryDelay: number;
  isSelected: boolean;
  highlightPulse: number;
}

export type ColorScheme = 'viridis' | 'plasma' | 'cool' | 'warm' | 'rainbow';

export interface MappingConfig {
  xAxis: string;
  yAxis: string;
  zAxis: string;
  colorField: string;
  sizeField: string;
  colorScheme: ColorScheme;
  sizeRange: [number, number];
  positionRange: [number, number];
}

export interface FilterRange {
  min: number;
  max: number;
}

export type Filters = Record<string, FilterRange>;

export interface UIState {
  panelCollapsed: boolean;
  selectedParticleId: string | null;
  isEntryAnimating: boolean;
  cameraResetTrigger: number;
  transitionDuration: number;
}

export interface DataNebulaState {
  particles: Particle[];
  fields: FieldInfo[];
  datasetName: string;
  mapping: MappingConfig;
  filters: Filters;
  ui: UIState;
  loadJSON: (json: any[], name?: string) => void;
  loadSampleData: () => void;
  setMapping: (partial: Partial<MappingConfig>) => void;
  setFilter: (field: string, range: FilterRange) => void;
  resetFilters: () => void;
  selectParticle: (id: string | null) => void;
  togglePanel: () => void;
  triggerCameraReset: () => void;
  recalculateParticles: () => void;
}
