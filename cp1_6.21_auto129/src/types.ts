export enum TileType {
  Empty = 0,
  Grass = 1,
  StonePath = 2,
  WoodFloor = 3,
  Water = 4,
  Wall = 5
}

export type TileMatrix = number[][];

export interface ExportData {
  width: number;
  height: number;
  tileSize: number;
  matrix: TileMatrix;
}

export interface TileInfo {
  type: TileType;
  name: string;
  color: string;
  pattern?: string;
}

export const TILE_INFO: Record<number, TileInfo> = {
  [TileType.Empty]: { type: TileType.Empty, name: '空', color: 'transparent' },
  [TileType.Grass]: { type: TileType.Grass, name: '草地', color: '#4a7c3a' },
  [TileType.StonePath]: { type: TileType.StonePath, name: '石板路', color: '#888888' },
  [TileType.WoodFloor]: { type: TileType.WoodFloor, name: '木地板', color: '#a0703a' },
  [TileType.Water]: { type: TileType.Water, name: '水体', color: '#3a7ca0' },
  [TileType.Wall]: { type: TileType.Wall, name: '墙壁', color: '#5a5a5a' }
};

export const GRID_SIZE = 20;
export const TILE_SIZE = 60;
export const PLAYER_SIZE = 32;
export const PLAYER_SPEED = 4;
