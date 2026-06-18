export interface Position {
  x: number;
  y: number;
}

export interface Station {
  id: string;
  name: string;
  position: Position;
  color: string;
  connectedLineIds: string[];
  createdAt: number;
}

export interface Line {
  id: string;
  startStationId: string;
  endStationId: string;
  color: string;
  width: number;
  controlPoint: Position;
  createdAt: number;
}

export interface Selection {
  type: 'station' | 'line' | null;
  id: string | null;
}

export interface HistoryState {
  stations: Station[];
  lines: Line[];
}

export type OperationMode = 'select' | 'createStation' | 'createLine' | 'delete';

export interface LineCreationState {
  firstStationId: string | null;
}

export interface ExportStation {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  connectedLineIds: string[];
}

export interface ExportLine {
  id: string;
  startStationId: string;
  endStationId: string;
  color: string;
  width: number;
  controlPoints: Position[];
}

export interface ExportData {
  stations: ExportStation[];
  lines: ExportLine[];
}

export const PRESET_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e91e63',
  '#00bcd4',
];
