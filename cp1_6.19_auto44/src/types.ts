export type FurnitureType = 'sofa' | 'table' | 'chair' | 'cabinet' | 'bed' | 'lamp'

export interface Wall {
  start: [number, number]
  end: [number, number]
  height: number
}

export interface Door {
  position: [number, number]
  width: number
  height: number
  rotation: number
}

export interface Window {
  position: [number, number]
  width: number
  height: number
  rotation: number
  yOffset: number
}

export interface Room {
  width: number
  depth: number
  height: number
  walls: Wall[]
  doors: Door[]
  windows: Window[]
}

export interface FurnitureTemplate {
  type: FurnitureType
  name: string
  width: number
  depth: number
  height: number
  color: string
}

export interface Furniture {
  id: string
  type: FurnitureType
  position: [number, number, number]
  rotation: number
  scale: number
}

export interface Stats {
  totalArea: number
  occupiedArea: number
  furnitureCount: number
  occlusionRate: number
}

export const FURNITURE_TEMPLATES: Record<FurnitureType, FurnitureTemplate> = {
  sofa: {
    type: 'sofa',
    name: '沙发',
    width: 2.2,
    depth: 0.9,
    height: 0.85,
    color: '#8B7355',
  },
  table: {
    type: 'table',
    name: '桌子',
    width: 1.2,
    depth: 0.8,
    height: 0.75,
    color: '#A0522D',
  },
  chair: {
    type: 'chair',
    name: '椅子',
    width: 0.5,
    depth: 0.5,
    height: 0.9,
    color: '#CD853F',
  },
  cabinet: {
    type: 'cabinet',
    name: '柜子',
    width: 1.0,
    depth: 0.4,
    height: 2.0,
    color: '#8B4513',
  },
  bed: {
    type: 'bed',
    name: '床',
    width: 2.0,
    depth: 1.8,
    height: 0.5,
    color: '#DEB887',
  },
  lamp: {
    type: 'lamp',
    name: '灯具',
    width: 0.4,
    depth: 0.4,
    height: 1.6,
    color: '#F5DEB3',
  },
}

export const FURNITURE_TYPE_LIST: FurnitureType[] = ['sofa', 'table', 'chair', 'cabinet', 'bed', 'lamp']

export const DEFAULT_ROOM: Room = {
  width: 8,
  depth: 6,
  height: 2.8,
  walls: [],
  doors: [
    {
      position: [0, 3],
      width: 0.9,
      height: 2.1,
      rotation: 0,
    },
  ],
  windows: [
    {
      position: [4, 6],
      width: 1.5,
      height: 1.2,
      rotation: Math.PI,
      yOffset: 1.0,
    },
  ],
}

export const GRID_SIZE = 0.5
export const CAMERA_MIN_DISTANCE = 2
export const CAMERA_MAX_DISTANCE = 20
export const ROTATION_STEP = Math.PI / 4
export const POSITION_STEP = 0.5
export const MENU_ANIMATION_DURATION = 0.2
export const STATS_UPDATE_DELAY = 300
export const VALUE_ANIMATION_DURATION = 0.4

export const COLORS = {
  wall: '#e8e0d4',
  floor: '#c4a882',
  ceiling: '#f5f5f0',
  sidebar: '#2c2c2c',
  icon: '#d4a574',
  iconHover: '#f0c48b',
}
