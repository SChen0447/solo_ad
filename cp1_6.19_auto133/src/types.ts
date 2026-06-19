export interface Point {
  x: number;
  y: number;
  jitterX: number;
  jitterY: number;
  alpha: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  userId: string;
  version: number;
}

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface StickyNoteData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: StickyNoteColor;
  userId: string;
  zIndex: number;
  version: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  socketId: string;
}

export interface RemoteCursor {
  userId: string;
  x: number;
  y: number;
  lastSeen: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

export const COLOR_PALETTE = [
  '#1a1a1a',
  '#FF6B6B',
  '#FF8C42',
  '#F8B500',
  '#2ECC71',
  '#4ECDC4',
  '#45B7D1',
  '#3498DB',
  '#9B59B6',
  '#E91E63',
  '#95a5a6',
  '#ffffff'
];

export const STICKY_COLORS: Record<StickyNoteColor, string> = {
  yellow: '#FFF8DC',
  pink: '#FFD1DC',
  blue: '#D6EAF8',
  green: '#D5F5E3'
};

export const STICKY_BORDER_COLORS: Record<StickyNoteColor, string> = {
  yellow: '#F4D03F',
  pink: '#F5B7B1',
  blue: '#85C1E9',
  green: '#82E0AA'
};
