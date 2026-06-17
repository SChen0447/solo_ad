export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface PartitionWall {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

export interface FurnitureItem {
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  opacity: number;
}

export interface InitialLight {
  name: string;
  type: 'point' | 'spot';
  x: number;
  y: number;
  z: number;
  color: string;
  intensity: number;
}

export const ROOM: RoomDimensions = {
  width: 5,
  depth: 4,
  height: 3,
};

export const COLORS = {
  floor: '#d2b48c',
  wall: '#f5f0e1',
  ceiling: '#e0e0e0',
  partitionWall: '#dcd3c6',
  partitionWallThickness: 0.1,
  partitionWallHeight: 2.5,
  dayAmbient: '#aaccff',
  nightAmbient: '#ffccaa',
  daySky: '#87ceeb',
  nightSky: '#0a0a2e',
};

export const PARTITION_WALLS: PartitionWall[] = [
  {
    x: 2.5,
    z: 2.0,
    width: 0.1,
    depth: 1.5,
    height: 2.5,
    color: COLORS.partitionWall,
  },
];

export const FURNITURE: FurnitureItem[] = [
  {
    name: '餐桌',
    x: 3.5,
    z: 1.0,
    width: 2.0,
    depth: 1.0,
    color: '#8b7355',
    opacity: 0.4,
  },
  {
    name: '沙发1',
    x: 0.5,
    z: 3.2,
    width: 0.8,
    depth: 0.8,
    color: '#6a5acd',
    opacity: 0.35,
  },
  {
    name: '沙发2',
    x: 1.5,
    z: 3.2,
    width: 0.8,
    depth: 0.8,
    color: '#6a5acd',
    opacity: 0.35,
  },
];

export const INITIAL_LIGHTS: InitialLight[] = [
  {
    name: '吸顶灯',
    type: 'point',
    x: 2.5,
    y: 2.95,
    z: 2.0,
    color: '#ffecd2',
    intensity: 0.8,
  },
  {
    name: '台灯',
    type: 'point',
    x: 4.0,
    y: 0.8,
    z: 0.8,
    color: '#ffe0b2',
    intensity: 0.5,
  },
  {
    name: '落地灯',
    type: 'point',
    x: 0.3,
    y: 1.6,
    z: 3.5,
    color: '#ffcc80',
    intensity: 0.4,
  },
];

export const MAX_LIGHTS = 10;
