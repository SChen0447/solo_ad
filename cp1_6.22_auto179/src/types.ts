export interface TerrainParams {
  roughness: number;
  altitude: number;
  erosion: number;
  seed: number;
}

export interface ParticleData {
  position: [number, number, number];
  velocity: [number, number, number];
  active: boolean;
  lifetime: number;
}

export interface WaterPoolData {
  centerX: number;
  centerZ: number;
  radius: number;
  depth: number;
}

export interface CameraState {
  distance: number;
  azimuth: number;
  elevation: number;
  targetX: number;
  targetZ: number;
}

export interface SceneStats {
  roughness: number;
  altitude: number;
  erosion: number;
  particleCount: number;
  fps: number;
}

export const GRID_SIZE = 512;
export const CELL_SIZE = 0.1;
export const TERRAIN_EXTENT = 50;
export const MAX_PARTICLES = 2000;
export const DEFAULT_PARTICLE_COUNT = 500;
export const PARTICLE_SIZE = 0.3;
export const WATERFALL_ANGLE_THRESHOLD = 30;
export const WATERFALL_SPEED_MULTIPLIER = 1.5;
export const DEFAULT_CAMERA_DISTANCE = 40;
export const DEFAULT_CAMERA_ELEVATION = 45;
export const DEFAULT_CAMERA_AZIMUTH = 0;
export const MIN_CAMERA_DISTANCE = 5;
export const MAX_CAMERA_DISTANCE = 50;
export const MIN_ELEVATION = -30;
export const MAX_ELEVATION = 60;
export const ROTATION_SPEED = 0.005;

export const COLOR_LOW = 0x2d5016;
export const COLOR_MID = 0x8b5e3c;
export const COLOR_HIGH = 0xe0d5c1;
export const COLOR_PEAK = 0xffffff;
export const COLOR_PARTICLE = 0x3b82f6;
export const COLOR_SKY = 0x87ceeb;
export const COLOR_BG = 0x0a0a1a;
export const COLOR_PANEL = 0x1a1a2e;
