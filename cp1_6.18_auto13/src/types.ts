export type BeatType = 'strong' | 'weak' | 'bonus';

export interface BeatEvent {
  time: number;
  type: BeatType;
  bar: number;
  beatInBar: number;
}

export interface AnalysisResult {
  bpm: number;
  startTime: number;
  duration: number;
  beats: BeatEvent[];
  title: string;
}

export interface PresetTrack {
  id: string;
  title: string;
  bpm: number;
  duration: number;
  pattern: 'steady' | 'rock' | 'electronic';
}
