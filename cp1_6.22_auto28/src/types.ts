export interface StickyNote {
  id: string;
  board_id: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  votes: number;
}

export interface Connection {
  id: string;
  board_id: string;
  from_sticky_id: string;
  to_sticky_id: string;
}

export interface Board {
  id: string;
  name: string;
  created_at: string;
}

export interface OnlineUser {
  id: string;
  name: string;
  socketId: string;
}

export interface BoardData {
  board: Board;
  stickies: StickyNote[];
  connections: Connection[];
}

export type MacaronColor = 
  | '#FFD1DC'
  | '#B5EAD7'
  | '#FFF1C1'
  | '#DCD3FF'
  | '#C7CEEA'
  | '#FFDAC1'
  | '#E0E0E0'
  | '#D4BEA1';

export const MACARON_COLORS: MacaronColor[] = [
  '#FFD1DC',
  '#B5EAD7',
  '#FFF1C1',
  '#DCD3FF',
  '#C7CEEA',
  '#FFDAC1',
  '#E0E0E0',
  '#D4BEA1',
];
