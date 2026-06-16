export type Mood = 'passionate' | 'gentle' | 'melancholic' | 'peaceful' | 'inspiring';

export interface PoemFeatures {
  totalLines: number;
  avgCharsPerLine: number;
  mood: Mood;
  rhymePattern: string;
  lines: string[];
  lineCharCounts: number[];
  bpm: number;
  durationPerLine: number[];
  totalDuration: number;
}

export interface GenerateVideoRequest {
  poemFeatures: PoemFeatures;
  speed: number;
  volume: number;
  style: string;
}

export interface GenerateVideoResponse {
  videoUrl: string;
  audioUrl: string;
  backgroundVideoUrl: string;
  lines: string[];
  lineTimestamps: number[];
  totalDuration: number;
}

export interface ExportVideoResponse {
  downloadUrl: string;
  filename: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  currentLineIndex: number;
  totalDuration: number;
  speed: number;
  volume: number;
  style: string;
}
