export interface Note {
  id: string;
  track: number;
  step: number;
  velocity: number;
  userId: string;
  timestamp: number;
}

export interface Track {
  id: number;
  name: string;
  instrument: InstrumentType;
  color: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  role: InstrumentRole;
}

export type InstrumentType = 'piano' | 'drum' | 'bass' | 'lead';

export type InstrumentRole = '鼓手' | '键盘' | '贝斯' | '主音';

export interface Room {
  id: string;
  name: string;
  code: string;
  users: User[];
  maxUsers: number;
  notes: { [key: string]: boolean };
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'circle' | 'star';
}

export interface RecordingData {
  notes: Note[];
  bpm: number;
  tracks: Track[];
  duration: number;
}

export const INSTRUMENT_ROLES: { [key in InstrumentType]: InstrumentRole } = {
  piano: '键盘',
  drum: '鼓手',
  bass: '贝斯',
  lead: '主音'
};

export const TRACK_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#a55eea', '#26de81', '#fd79a8', '#00b894', '#e17055', '#74b9ff', '#fdcb6e', '#e84393', '#00cec9', '#6c5ce7', '#fab1a0', '#7f8c8d'];

export const TRACK_NAMES = ['钢琴 1', '鼓 1', '贝斯 1', '主音 1', '钢琴 2', '鼓 2', '贝斯 2', '主音 2', '钢琴 3', '鼓 3', '贝斯 3', '主音 3', '钢琴 4', '鼓 4', '贝斯 4', '主音 4'];

export const INSTRUMENT_TYPES: InstrumentType[] = ['piano', 'drum', 'bass', 'lead', 'piano', 'drum', 'bass', 'lead', 'piano', 'drum', 'bass', 'lead', 'piano', 'drum', 'bass', 'lead'];

export const STEP_WIDTH = 20;
export const STEP_HEIGHT = 20;
export const NUM_TRACKS = 16;
export const NUM_STEPS = 128;
export const MAX_STEPS_VISIBLE = 64;
export const DEFAULT_STEPS_VISIBLE = 16;
