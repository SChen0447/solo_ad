export type TerrainType = 'ground' | 'platform' | 'obstacle';

export interface TerrainBlock {
  id: string;
  x: number;
  y: number;
  type: TerrainType;
}

export interface PathPoint {
  id: string;
  x: number;
  y: number;
}

export interface NPCPath {
  id: string;
  points: PathPoint[];
  speed: number;
}

export interface LevelData {
  terrain: TerrainBlock[];
  paths: NPCPath[];
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  ground: '#4a7c59',
  platform: '#8b5e3c',
  obstacle: '#5c3a21',
};

export const TILE_SIZE = 32;
