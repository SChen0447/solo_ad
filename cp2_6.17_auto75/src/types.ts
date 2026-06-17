export interface Point {
  x: number;
  y: number;
}

export interface Path {
  id: string;
  type: 'path';
  points: Point[];
  color: string;
  width: number;
  userId: string;
  userName: string;
}

export interface Rect {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  userId: string;
  userName: string;
}

export interface Text {
  id: string;
  type: 'text';
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  userId: string;
  userName: string;
}

export interface StickyNote {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  bgColor: string;
  userId: string;
  userName: string;
}

export interface ImageElement {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
  userId: string;
  userName: string;
}

export type DrawElement = Path | Rect | Text | StickyNote | ImageElement;

export type ToolType = 'pen' | 'rect' | 'text' | 'sticky' | 'image' | 'pan';

export interface DrawEvent {
  type: 'draw' | 'update' | 'delete';
  element: DrawElement;
  roomId: string;
  userId: string;
}

export interface InitSyncMessage {
  type: 'init';
  elements: DrawElement[];
  roomId: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  elements: DrawElement[];
  thumbnail?: string;
}

export interface BoardState {
  elements: DrawElement[];
  pan: Point;
  zoom: number;
}

export interface UserInfo {
  id: string;
  name: string;
  color: string;
}

export const COLOR_PALETTE: string[] = [
  '#e53935',
  '#d81b60',
  '#8e24aa',
  '#5e35b1',
  '#3949ab',
  '#1e88e5',
  '#039be5',
  '#00acc1',
  '#00897b',
  '#43a047',
  '#fb8c00',
  '#f4511e'
];

export const STICKY_COLORS: string[] = [
  '#fff9c4',
  '#ffecb3',
  '#ffe0b2',
  '#ffccbc',
  '#f8bbd0',
  '#e1bee7',
  '#d1c4e9',
  '#c5cae9',
  '#bbdefb',
  '#b3e5fc',
  '#b2ebf2',
  '#b2dfdb'
];
