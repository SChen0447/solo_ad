export type Pitch = 'low' | 'mid' | 'high';

export interface BeatNote {
  timestamp: number;
  pitch: Pitch;
  intensity: 1 | 2 | 3 | 4 | 5;
}

export interface BeatSequence {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  colorTheme: 'warm' | 'cool';
  notes: BeatNote[];
}

export type PlatformType = 'moving' | 'fixed' | 'obstacle';

export interface LevelElement {
  id: string;
  type: PlatformType;
  x: number;
  y: number;
  width: number;
  height: number;
  spawnTime: number;
  pitch: Pitch;
  intensity: number;
  hasCollectible: boolean;
  moveRange?: number;
  moveSpeed?: number;
}

export interface LevelData {
  totalDuration: number;
  bpm: number;
  elements: LevelElement[];
  totalNotes: number;
}

export interface ScoreResult {
  score: number;
  accuracy: number;
  totalNotes: number;
  hitNotes: number;
  perfectHits: number;
  grade: 'S' | 'A' | 'B' | 'C';
}
