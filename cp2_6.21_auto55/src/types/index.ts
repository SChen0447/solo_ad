export interface Point {
  x: number;
  y: number;
}

export type ToolType = 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'sticker';

export type StickerType = 'smile' | 'star' | 'arrow' | 'flower' | 'lightning' | 'heart';

export interface Path {
  id: string;
  tool: 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line';
  points: Point[];
  color: string;
  size: number;
  userId: string;
}

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  userId: string;
}

export interface StickerItem {
  id: string;
  type: StickerType;
  x: number;
  y: number;
  userId: string;
}

export interface User {
  id: string;
  nickname: string;
  isCreator: boolean;
  avatarColor: string;
}

export interface HistoryState {
  paths: Path[];
  texts: TextItem[];
  stickers: StickerItem[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatarColor: string;
  text: string;
  timestamp: number;
  type: 'message' | 'system';
}

export interface DrawStartData {
  pathId: string;
  tool: string;
  x: number;
  y: number;
  color: string;
  size: number;
  userId: string;
}

export interface DrawMoveData {
  pathId: string;
  x: number;
  y: number;
  userId: string;
}

export interface DrawEndData {
  pathId: string;
  userId: string;
  points: Point[];
}
