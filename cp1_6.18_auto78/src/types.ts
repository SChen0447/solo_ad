export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'bounce'
  | 'elastic'
  | 'back';

export interface KeyframeValue {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface Keyframe {
  id: string;
  time: number;
  easing: EasingType;
  values: KeyframeValue;
}

export interface TextStyle {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeWidth: number;
  strokeColor: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  fps: number;
  loop: boolean;
  speed: number;
}

export interface EditorState {
  textStyle: TextStyle;
  keyframes: Keyframe[];
  playback: PlaybackState;
  selectedKeyframeId: string | null;
  isExporting: boolean;
  exportProgress: number;
}

export interface EditorActions {
  setTextStyle: (style: Partial<TextStyle>) => void;
  addKeyframe: (time: number, values?: Partial<KeyframeValue>) => void;
  removeKeyframe: (id: string) => void;
  updateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
  selectKeyframe: (id: string | null) => void;
  setPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setLoop: (loop: boolean) => void;
  setSpeed: (speed: number) => void;
  setTotalDuration: (duration: number) => void;
  setExporting: (isExporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  getInterpolatedValues: (time: number) => KeyframeValue;
}

export const EASING_COLORS: Record<EasingType, string> = {
  linear: '#00ff88',
  'ease-in': '#00b4d8',
  'ease-out': '#e94560',
  'ease-in-out': '#ffd700',
  bounce: '#ff8c00',
  elastic: '#9b59b6',
  back: '#1abc9c'
};

export const EASING_LABELS: Record<EasingType, string> = {
  linear: '线性',
  'ease-in': '缓入',
  'ease-out': '缓出',
  'ease-in-out': '缓入缓出',
  bounce: '弹跳',
  elastic: '弹性',
  back: '回退'
};

export const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Microsoft YaHei',
  'SimHei',
  'SimSun',
  'KaiTi',
  'STXihei'
];

export const DEFAULT_TEXT_STYLE: TextStyle = {
  text: '动态文字',
  fontFamily: 'Microsoft YaHei',
  fontSize: 48,
  color: '#ffffff',
  strokeWidth: 0,
  strokeColor: '#000000'
};

export const DEFAULT_KEYFRAME_VALUES: KeyframeValue = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1
};

export const DEFAULT_PLAYBACK: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  totalDuration: 3000,
  fps: 60,
  loop: false,
  speed: 1
};
