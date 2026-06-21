export const CANVAS_WIDTH = 320;
export const CANVAS_HEIGHT = 320;
export const GRID_SIZE = 32;
export const GRID_COLS = 10;
export const GRID_ROWS = 10;

export const GRAVITY = 0.5;
export const JUMP_FORCE = -8;
export const MOVE_SPEED = 3;
export const MAX_FALL_SPEED = 10;

export const PLAYER_SIZE = 16;
export const PLAYER_START_X = 32;
export const PLAYER_START_Y = 240;

export const COLORS = {
  BACKGROUND: '#1a202c',
  GRID_LINE: '#2d3748',
  PLATFORM: '#4a5568',
  PLATFORM_BORDER: '#ffffff',
  PLAYER: '#e53e3e',
  GOAL: '#38a169',
  TEXT: '#ffffff',
  HOVER_HIGHLIGHT: 'rgba(255, 255, 255, 0.3)'
} as const;

export const TARGET_FPS = 60;
export const IDLE_FPS = 30;
export const FADE_DURATION = 200;
export const HOVER_EASE_DURATION = 300;

export type GameMode = 'editor' | 'play';
