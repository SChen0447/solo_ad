export type PaperSize = 'A5' | 'A6' | 'B6';

export interface PaperDimensions {
  width: number;
  height: number;
  name: PaperSize;
}

export const PAPER_SIZES: Record<PaperSize, PaperDimensions> = {
  A5: { width: 420, height: 594, name: 'A5' },
  A6: { width: 297, height: 420, name: 'A6' },
  B6: { width: 354, height: 500, name: 'B6' },
};

export const PAPER_MM: Record<PaperSize, { width: number; height: number }> = {
  A5: { width: 148, height: 210 },
  A6: { width: 105, height: 148 },
  B6: { width: 125, height: 176 },
};

export type ElementType = 'rect' | 'text' | 'line' | 'date';

export type BorderStyle = 'solid' | 'dashed' | 'dotted';

export interface BaseStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: BorderStyle;
  borderRadius: number;
}

export interface TextStyle extends BaseStyle {
  content: string;
  fontSize: number;
  fontColor: string;
  letterSpacing: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  style: BaseStyle | TextStyle;
}

export type AlignmentType =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center-h'
  | 'center-v';

export interface GuideLine {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
}

export interface Template {
  id: string;
  name: string;
  paperSize: PaperSize;
  elements: CanvasElement[];
  thumbnail: string;
  createdAt: number;
}

export const PRESET_COLORS = [
  '#FFFFFF',
  '#F9FAFB',
  '#F3F4F6',
  '#E5E7EB',
  '#D1D5DB',
  '#9CA3AF',
  '#6B7280',
  '#374151',
  '#111827',
  '#FEE2E2',
  '#FECACA',
  '#FCA5A5',
  '#F87171',
  '#EF4444',
  '#FEF3C7',
  '#FDE68A',
  '#FCD34D',
  '#FBBF24',
  '#F59E0B',
  '#D1FAE5',
  '#A7F3D0',
  '#6EE7B7',
  '#34D399',
  '#10B981',
  '#DBEAFE',
  '#BFDBFE',
  '#93C5FD',
  '#60A5FA',
  '#3B82F6',
  '#EDE9FE',
  '#DDD6FE',
  '#C4B5FD',
  '#A78BFA',
  '#8B5CF6',
  '#FCE7F3',
  '#FBCFE8',
  '#F9A8D4',
  '#F472B6',
  '#EC4899',
];

export const DEFAULT_BASE_STYLE: BaseStyle = {
  backgroundColor: '#FFFFFF',
  borderColor: '#374151',
  borderWidth: 1,
  borderStyle: 'solid',
  borderRadius: 0,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  ...DEFAULT_BASE_STYLE,
  content: '文本内容',
  fontSize: 14,
  fontColor: '#111827',
  letterSpacing: 0,
};
