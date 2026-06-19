export type AnimationType = 'fade' | 'scale' | 'slide';

export interface LyricLine {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  duration: number;
  animation: AnimationType;
  color: string;
  paragraphIndex: number;
}

export interface ParsedLyric {
  lines: LyricLine[];
  totalDuration: number;
}

export type ExportFormat = 'srt' | 'ass';

export interface AnimationState {
  opacity: number;
  scale: number;
  translateX: number;
}
