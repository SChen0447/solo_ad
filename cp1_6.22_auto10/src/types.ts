export enum TileType {
  EMPTY = 'empty',
  GROUND = 'ground',
  PLATFORM = 'platform',
  TRAP = 'trap',
  CHECKPOINT = 'checkpoint'
}

export interface TileData {
  type: TileType;
  x: number;
  y: number;
}

export interface LevelData {
  width: number;
  height: number;
  tiles: TileData[][];
  checkpoints: { x: number; y: number }[];
  savedAt?: number;
}

export interface Position {
  x: number;
  y: number;
}

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 15;
export const TILE_SIZE = 40;
export const GRAVITY = 800;
export const JUMP_FORCE = -450;
export const MOVE_SPEED = 250;
export const PLAYER_RADIUS = 10;
