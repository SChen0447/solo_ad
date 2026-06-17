export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface BaseElement {
  id: string;
  type: 'stroke' | 'sticky' | 'arrow';
  x: number;
  y: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  width: number;
  height: number;
  text: string;
  bgColor: string;
  shape: 'rectangle' | 'circle' | 'hexagon';
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  startElementId: string;
  endElementId: string;
  color: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export type CanvasElement = StrokeElement | StickyElement | ArrowElement;

export interface OnlineUser {
  id: string;
  nickname: string;
  color: string;
  cursorX: number;
  cursorY: number;
  lastActive: number;
}

export type ToolType = 'select' | 'pen' | 'sticky' | 'arrow' | 'eraser';

export const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFC107', '#9B59B6',
  '#E74C3C', '#2ECC71', '#3498DB', '#F39C12', '#1ABC9C',
  '#E67E22', '#27AE60'
];

export const THICKNESS_OPTIONS = [3, 6, 9];

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFC107', '#9B59B6',
  '#E74C3C', '#2ECC71', '#3498DB'
];
