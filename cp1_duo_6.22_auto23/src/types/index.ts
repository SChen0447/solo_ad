export type InEffectType = 'fadeIn' | 'slideUp' | 'scaleIn';
export type OutEffectType = 'fadeOut' | 'slideUpOut' | 'scaleOut';
export type EffectType = InEffectType | OutEffectType;

export interface Subtitle {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  fontSize: number;
  color: string;
  inEffect: InEffectType;
  outEffect: OutEffectType;
}

export interface EffectConfig {
  inAnimationDuration: number;
  outAnimationDuration: number;
}

export interface TransformMatrix {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

export interface RenderState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  progress: number;
}

export interface ExportState {
  isExporting: boolean;
  progress: number;
  downloadUrl: string | null;
}

export type EventType =
  | 'subtitle:add'
  | 'subtitle:update'
  | 'subtitle:delete'
  | 'subtitle:reorder'
  | 'effect:update'
  | 'player:play'
  | 'player:pause'
  | 'player:seek'
  | 'export:start'
  | 'export:progress'
  | 'export:complete';

export interface EventPayload {
  'subtitle:add': Subtitle;
  'subtitle:update': { id: string; updates: Partial<Subtitle> };
  'subtitle:delete': string;
  'subtitle:reorder': { fromIndex: number; toIndex: number };
  'effect:update': EffectConfig;
  'player:play': void;
  'player:pause': void;
  'player:seek': number;
  'export:start': void;
  'export:progress': number;
  'export:complete': string;
}

export const IN_EFFECTS: { value: InEffectType; label: string }[] = [
  { value: 'fadeIn', label: '淡入' },
  { value: 'slideUp', label: '从底部滑入' },
  { value: 'scaleIn', label: '缩放出现' },
];

export const OUT_EFFECTS: { value: OutEffectType; label: string }[] = [
  { value: 'fadeOut', label: '淡出' },
  { value: 'slideUpOut', label: '向顶部滑出' },
  { value: 'scaleOut', label: '缩小消失' },
];

export const TIMELINE_MAX_DURATION = 30;

export const SUBTITLE_COLORS = [
  '#e94560',
  '#4ecca3',
  '#f39c12',
  '#9b59b6',
  '#3498db',
  '#1abc9c',
  '#e74c3c',
  '#f1c40f',
];
