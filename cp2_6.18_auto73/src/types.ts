export type ResourceType = 'iron' | 'crystal' | 'gas' | 'obstacle';

export interface HexCell {
  id: string;
  q: number;
  r: number;
  x: number;
  y: number;
  type: ResourceType;
  selected: boolean;
  explored: number;
  efficiency: number;
  annualOutput: number;
  hovered: boolean;
  pulseScale: number;
  rotationAngle: number;
}

export interface GameState {
  cells: HexCell[];
  selectedCell: HexCell | null;
  totalExtraction: number;
  totalRevenue: number;
  lastExtractionUpdate: number;
}

export interface GameStats {
  totalExtraction: number;
  totalRevenue: number;
  deployedMines: number;
  totalEfficiency: number;
}

export type GameEventType =
  | 'cell-selected'
  | 'cell-deselected'
  | 'efficiency-changed'
  | 'exploration-updated'
  | 'stats-updated';

export interface GameEvent {
  type: GameEventType;
  data?: unknown;
}

export type EventListener = (event: GameEvent) => void;

export const HEX_SIZE = 40;
export const HEX_SIDE = 34;
export const GRID_COLS = 8;
export const GRID_ROWS = 6;
export const PANEL_WIDTH = 280;
export const STATUSBAR_HEIGHT = 48;
export const CHAIN_HEIGHT = 120;

export const COLORS = {
  iron: '#9ca3af',
  crystal: '#8b5cf6',
  gas: '#a3e635',
  obstacle: '#4b5563',
  glow: '#e0f2fe',
  hoverGlow: '#9ca3af',
  slider: '#3b82f6',
  sliderHover: '#60a5fa',
  sliderTrack: '#374151',
  panelBg: '#1f2937',
  chainBg: '#111827',
  statusBg: '#0f172a',
  mainBg: '#0b0f19',
  arrow: '#2563eb',
  text: '#ffffff',
  textSecondary: '#9ca3af',
};

export const RESOURCE_NAMES: Record<Exclude<ResourceType, 'obstacle'>, string> = {
  iron: '铁矿',
  crystal: '水晶',
  gas: '气体',
};
