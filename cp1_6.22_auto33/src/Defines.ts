export const GRID_SIZE = 8;
export const CELL_SIZE = 50;
export const MAP_WIDTH = GRID_SIZE * CELL_SIZE;
export const MAP_HEIGHT = GRID_SIZE * CELL_SIZE;

export const HIDER_SPEED = 180;
export const SEEKER_SPEED = HIDER_SPEED * 0.9;

export const ITEM_COOLDOWN = 3000;
export const MAX_ITEMS = 4;
export const HIDER_ALPHA = 0.2;

export const SCAN_COOLDOWN = 4000;
export const MAX_SCAN_CHARGES = 3;
export const SCAN_RANGE = 1;
export const SCAN_HIGHLIGHT_DURATION = 500;
export const SCAN_FLASH_DURATION = 200;
export const SCAN_FLASH_COUNT = 2;

export const GAME_DURATION = 180000;

export const COLORS = {
  BACKGROUND: '#1a1a2e',
  TEXT: '#e0f7fa',
  PRIMARY_START: '#667eea',
  PRIMARY_END: '#764ba2',
  GRID_LIGHT: '#3a3a5a',
  GRID_DARK: '#2a2a4a',
  WALL: '#4a4a6a',
  LOW_WALL: '#5a5a7a',
  HIDER: '#00e5ff',
  SEEKER: '#ff5252',
  ITEM_BOX: '#8d6e63',
  ITEM_BUSH: '#4caf50',
  ITEM_SIGN: '#ffeb3b',
  SCAN_HIGHLIGHT: '#fff59d',
  DETECTION_FLASH: '#ff0000',
  MINIMAP_SELF: '#2196f3',
  MINIMAP_SEEKER: '#f44336',
  MINIMAP_ITEM: '#4caf50',
  SEPARATOR: 'rgba(102, 126, 234, 0.5)'
};

export const MAP_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 2, 2, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0]
];

export const TILE_TYPES = {
  EMPTY: 0,
  WALL: 1,
  LOW_WALL: 2
};

export const ITEM_TYPES = ['box', 'bush', 'sign'] as const;
export type ItemType = typeof ITEM_TYPES[number];

export const SEEKER_VIEW_WIDTH = 500;
export const SEEKER_VIEW_HEIGHT = 500;
export const MINIMAP_SIZE = 160;

export const GAME_WIDTH = 900;
export const GAME_HEIGHT = 600;
