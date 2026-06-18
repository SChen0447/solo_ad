export type NoteColor = 'red' | 'blue' | 'green';

export type JudgmentType = 'perfect' | 'good' | 'miss';

export interface NoteData {
  id: number;
  time: number;
  color: NoteColor;
  hit: boolean;
  judged: boolean;
}

export interface Ripple {
  id: number;
  x: number;
  y: number;
  type: JudgmentType;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  startTime: number;
}

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  total: number;
  hits: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
}

export interface GameState {
  phase: 'idle' | 'countdown' | 'playing' | 'finished';
  countdownValue: number;
  currentTime: number;
  levelDuration: number;
  fps: number;
  particleCount: number;
}

export interface LevelData {
  duration: number;
  notes: NoteData[];
}

export const NOTE_PITCH: Record<NoteColor, number> = {
  red: 261.63,
  blue: 329.63,
  green: 392.00
};

export const NOTE_FILL: Record<NoteColor, string> = {
  red: '#ff4757',
  blue: '#3742fa',
  green: '#2ed573'
};

export const NOTE_GLOW: Record<NoteColor, string> = {
  red: 'rgba(255, 71, 87, 0.6)',
  blue: 'rgba(55, 66, 250, 0.6)',
  green: 'rgba(46, 213, 115, 0.6)'
};
