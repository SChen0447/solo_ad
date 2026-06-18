export interface AudioResource {
  id: string;
  name: string;
  duration: number;
  buffer: AudioBuffer;
  thumbnailData: Float32Array;
  color: string;
}

export interface Track {
  id: string;
  resourceId: string;
  name: string;
  startTime: number;
  endTime: number;
  volume: number;
  color: string;
  buffer: AudioBuffer;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  startTimestamp: number;
}

export const TRACK_COLORS = [
  '#e94560',
  '#0f3460',
  '#533483',
  '#16c79a',
  '#f5a623',
  '#4ecdc4',
  '#ff6b6b',
  '#a29bfe',
];

export const TIMELINE_MIN_GRANULARITY = 0.1;
export const DEFAULT_VOLUME = 80;
export const MAX_VOLUME = 100;
