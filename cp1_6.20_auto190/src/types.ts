export const CANVAS_WIDTH = 64;
export const CANVAS_HEIGHT = 64;
export const STAGE_WIDTH = 800;
export const STAGE_HEIGHT = 400;
export const THUMBNAIL_SIZE = 60;
export const TRACK_HEIGHT = 40;
export const DEFAULT_FPS = 12;

export const COLORS: Record<number, string> = {
  0: 'transparent',
  1: '#FF4444',
  2: '#4488FF',
  3: '#FFCC00',
  4: '#888888',
};

export const BRUSH_COLORS = [
  { id: 1, color: '#FF4444', name: '红' },
  { id: 2, color: '#4488FF', name: '蓝' },
  { id: 3, color: '#FFCC00', name: '黄' },
  { id: 4, color: '#888888', name: '灰' },
];

export const CHARACTER_COLORS: Record<string, string> = {
  player: '#4A90D9',
  enemy: '#D94A4A',
  item: '#6DBF6B',
};

export interface PixelFrame {
  id: string;
  width: number;
  height: number;
  pixels: number[][];
  createdAt: number;
}

export interface CharacterAction {
  id: string;
  name: string;
  characterType: 'player' | 'enemy' | 'item';
  frames: PixelFrame[];
  frameDuration: number;
}

export interface TrackClip {
  id: string;
  actionId: string;
  startFrame: number;
  duration: number;
}

export interface Track {
  id: string;
  characterType: 'player' | 'enemy' | 'item';
  name: string;
  clips: TrackClip[];
}

export interface ProjectData {
  version: string;
  name: string;
  actions: CharacterAction[];
  tracks: Track[];
  fps: number;
}

export type CharacterType = 'player' | 'enemy' | 'item';
