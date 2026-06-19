export interface NoteCard {
  id: string;
  title: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  createdAt: number;
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
  '#FFE66D',
  '#95E1D3',
  '#A8D8EA',
  '#DDA0DD',
  '#FFD1DC',
];

export const DEFAULT_CARD_WIDTH = 220;
