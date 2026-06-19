export interface Position {
  x: number;
  y: number;
}

export interface NoteCard {
  id: string;
  title: string;
  content: string;
  color: string;
  position: Position;
  createdAt: string;
  width?: number;
  height?: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
}

export interface AppState {
  cards: NoteCard[];
  connections: Connection[];
}

export const THEME_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8'
];
