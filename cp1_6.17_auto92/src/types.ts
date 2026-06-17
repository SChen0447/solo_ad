export interface HexCoord {
  q: number;
  r: number;
}

export type UnitType = 'cavalry' | 'infantry' | 'archer';

export interface Unit {
  id: string;
  type: UnitType;
  name: string;
  color: string;
}

export interface FormationPosition {
  offset: HexCoord;
  unitType: UnitType;
}

export interface Formation {
  id: string;
  name: string;
  description: string;
  pattern: FormationPosition[];
  thumbnailPattern: HexCoord[];
}

export type AnimationState = 'idle' | 'entering' | 'exiting' | 'dragging';

export interface PlacedUnit {
  instanceId: string;
  unit: Unit;
  position: HexCoord;
  animationState: AnimationState;
  animationStart: number;
}

export interface DeploymentState {
  placedUnits: PlacedUnit[];
  timestamp: number;
}

export interface HexSize {
  width: number;
  height: number;
}

export const GRID_COLS = 7;
export const GRID_ROWS = 9;
export const HEX_SIZE = 40;

export const COLORS = {
  BACKGROUND: '#1A2B4C',
  GRID_STROKE: '#D4E6F1',
  GRID_FILL: '#E8E8E8',
  GRID_HOVER: '#B0D4E8',
  GRID_SELECTED: '#6BAED6',
  PREVIEW_FILL: 'rgba(34, 197, 94, 0.3)',
  PREVIEW_STROKE: '#22C55E',
  PANEL_BG: '#F5F5F5',
  CARD_HOVER_SHADOW: '0 4px 12px rgba(0,0,0,0.15)',
  CAVALRY: '#E74C3C',
  INFANTRY: '#3498DB',
  ARCHER: '#2ECC71'
};
