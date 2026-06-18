export interface User {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawElement {
  id: string;
  type: 'stroke';
  points: Point[];
  color: string;
  thickness: number;
  userId: string;
  lastModifiedBy: string;
  modifiedAt: number;
}

export interface StickyNoteElement {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  userId: string;
  lastModifiedBy: string;
  modifiedAt: number;
}

export interface ImageElement {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  userId: string;
  lastModifiedBy: string;
  modifiedAt: number;
}

export type CanvasElement = DrawElement | StickyNoteElement | ImageElement;

export type ToolType = 'brush' | 'sticky' | 'image' | 'pan';

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface WSMessage {
  type: 'init' | 'user_joined' | 'user_left' | 'draw_stroke' | 'add_sticky'
    | 'update_sticky' | 'add_image' | 'cursor' | 'canvas_synced';
  payload: any;
}
