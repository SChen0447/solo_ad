export type ElementType = 'rectangle' | 'ellipse' | 'line' | 'freehand' | 'sticky' | 'connector' | 'text';
export type ToolType = 'select' | ElementType;

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  lineWidth: number;
  text?: string;
  points?: Point[];
  startElementId?: string;
  endElementId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  token: string;
}

export interface BoardInfo {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  participantCount: number;
}

export interface HistorySnapshot {
  id: string;
  elements: BaseElement[];
  createdAt: number;
  createdBy: string;
  createdByName: string;
}

export interface Operation {
  type: 'add' | 'delete' | 'update' | 'undo' | 'redo' | 'restore';
  element?: BaseElement;
  oldElement?: BaseElement;
  elementId?: string;
  timestamp: number;
  userId: string;
}

export const PRESET_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#111827'
];

export const LINE_WIDTHS = [1, 2, 4, 8];
