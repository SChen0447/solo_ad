import * as THREE from 'three';

export const GRID_SIZE = 5;
export const ROAD_WIDTH = 4;
export const ROAD_LENGTH = 20;
export const INTERSECTION_SIZE = 8;
export const TOTAL_PARTICLES = 2000;
export const PARTICLE_SIZE = 3;
export const TRAIL_LENGTH = 6;
export const DATA_UPDATE_INTERVAL = 3000;
export const LOD_DISTANCE_NEAR = 40;
export const LOD_DISTANCE_MID = 80;
export const LOD_PATH_DISTANCE = 30;
export const CAMERA_MIN_DISTANCE = 20;
export const CAMERA_MAX_DISTANCE = 120;
export const LOW_FPS_THRESHOLD = 30;

export const HEATMAP_COLORS = {
  LOW: 0x22c55e,
  MEDIUM: 0xeab308,
  HIGH: 0xef4444
};

export const DENSITY_RANGE = {
  MIN: 0,
  MAX: 200
};

export interface Vector2 {
  x: number;
  y: number;
}

export interface RoadSegment {
  id: string;
  type: 'horizontal' | 'vertical';
  start: Vector2;
  end: Vector2;
  width: number;
  length: number;
  lanes: number;
  trafficDensity: number;
  mesh: THREE.Mesh | null;
  edgeMesh: THREE.LineSegments | null;
  pathLine: THREE.Line | null;
}

export interface Intersection {
  id: string;
  position: Vector2;
  size: number;
  connectedRoads: string[];
  mesh: THREE.Mesh | null;
  haloMesh: THREE.Mesh | null;
}

export interface Particle {
  id: number;
  roadId: string;
  position: THREE.Vector3;
  direction: 1 | -1;
  speed: number;
  progress: number;
  trail: THREE.Vector3[];
  active: boolean;
}

export interface TrafficData {
  timestamp: number;
  roadDensities: Map<string, number>;
  flowDirections: Map<string, 1 | -1>;
}

export interface AppState {
  speedMultiplier: number;
  currentLOD: 'near' | 'mid' | 'far';
  cameraDistance: number;
  isRunning: boolean;
}

export type LODLevel = 'near' | 'mid' | 'far';

export interface HoverInfo {
  roadId: string;
  density: number;
  timestamp: number;
  screenX: number;
  screenY: number;
}
