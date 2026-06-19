export interface NoteCard {
  id: string;
  title: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  createdAt: number;
  width: number;
  height: number;
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

export const PRESET_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#95E1D3',
  '#DDA0DD',
  '#74B9FF',
  '#FAB1A0',
];
