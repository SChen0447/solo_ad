export type ElementType = 'rectangle' | 'ellipse' | 'line' | 'freehand' | 'sticky' | 'connector' | 'text';

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

export interface Board {
  id: string;
  name: string;
  elements: BaseElement[];
  createdAt: number;
  updatedAt: number;
  history: HistorySnapshot[];
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

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  token: string;
  boardId: string | null;
  socketId: string | null;
}

export interface BoardInfo {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  participantCount: number;
}
