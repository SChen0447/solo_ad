export type BubbleType = 'ellipse' | 'rectangle' | 'cloud';
export type EffectType = 'onomatopoeia' | 'speedline';
export type TextAlign = 'left' | 'center' | 'right';
export type BorderWidth = 1 | 2 | 3;

export interface Bubble {
  id: string;
  type: BubbleType;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  textColor: string;
  textAlign: TextAlign;
  borderRadius?: number;
}

export interface EffectItem {
  id: string;
  type: EffectType;
  subtype: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
  text?: string;
}

export interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  borderWidth: BorderWidth;
  borderColor: string;
  order: number;
  bubbles: Bubble[];
  effects: EffectItem[];
}

export interface EditorState {
  panels: Panel[];
  selectedPanelId: string | null;
  selectedBubbleId: string | null;
  selectedEffectId: string | null;
  panelSpacing: number;
}

export interface Size {
  width: number;
  height: number;
}

export const PRESET_COLORS: string[] = [
  '#FFFDE7', '#F3E5F5', '#E8EAF6', '#E0F7FA',
  '#E8F5E9', '#FFF3E0', '#FFEBEE', '#FCE4EC',
  '#F1F8E9', '#E0F2F1', '#EDE7F6', '#E3F2FD'
];

export const ONOMATOPOEIA_LIST: string[] = [
  'Boom', 'Whoosh', 'Zap', 'Splash', 'Crash', 'Pow', 'Bam', 'Thud'
];

export const SPEEDLINE_TYPES: string[] = ['horizontal', 'vertical', 'radial'];

export const GRID_SIZE = 30;
export const DEFAULT_PANEL_WIDTH = 200;
export const DEFAULT_PANEL_HEIGHT = 150;
export const MIN_PANEL_SIZE = 60;
export const CANVAS_PADDING = 40;
