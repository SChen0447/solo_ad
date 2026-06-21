export interface TransformGroup {
  translateX: number;
  translateY: number;
  rotate: number;
  scale: number;
  skewX: number;
  skewY: number;
}

export interface ColorGroup {
  startColor: string;
  endColor: string;
}

export interface AnimationSlice {
  id: string;
  selector: string;
  startTime: number;
  duration: number;
  delay: number;
  easing: string;
  transform: TransformGroup;
  opacity: number;
  color: ColorGroup;
}

export interface TimelineState {
  slices: AnimationSlice[];
  selectedSliceId: string | null;
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
}

export type ExportFormat = 'css' | 'js';

export const EASING_OPTIONS = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier(0.25, 0.1, 0.25, 1)',
  'cubic-bezier(0.42, 0, 1, 1)',
  'cubic-bezier(0, 0, 0.58, 1)',
  'cubic-bezier(0.42, 0, 0.58, 1)',
  'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
  'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
] as const;

export const DEFAULT_TRANSFORM: TransformGroup = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  scale: 1,
  skewX: 0,
  skewY: 0,
};

export const DEFAULT_COLOR: ColorGroup = {
  startColor: '#00D4AA',
  endColor: '#FF6B6B',
};
