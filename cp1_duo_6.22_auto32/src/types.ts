export type Point = {
  x: number;
  y: number;
};

export type DrawPath = {
  id: string;
  type: 'path';
  points: Point[];
  color: string;
  size: number;
  userId: string;
};

export type StickyNote = {
  id: string;
  type: 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  userId: string;
};

export type ConnectionLine = {
  id: string;
  type: 'line';
  fromId: string;
  toId: string;
  color: string;
  userId: string;
};

export type WhiteboardElement = DrawPath | StickyNote | ConnectionLine;

export type User = {
  id: string;
  name: string;
  color: string;
  cursor: Point;
};

export type Snapshot = {
  id: string;
  timestamp: number;
  label: string;
  elements: WhiteboardElement[];
};

export type Tool = 'brush' | 'eraser' | 'sticky' | 'select' | 'line';
