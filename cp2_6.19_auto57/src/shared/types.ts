export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

export type StickyNoteColor = 'yellow' | 'pink' | 'blue';

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  content: string;
  color: StickyNoteColor;
}

export type WSMessageType =
  | 'snapshot'
  | 'draw-start'
  | 'draw-continue'
  | 'draw-end'
  | 'add-note'
  | 'update-note'
  | 'delete-note'
  | 'clear-canvas'
  | 'undo'
  | 'redo'
  | 'online-count'
  | 'connection-status';

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
  clientId?: string;
}

export interface CanvasSnapshot {
  paths: DrawingPath[];
  notes: StickyNote[];
}

export interface HistoryState {
  paths: DrawingPath[];
  notes: StickyNote[];
}
