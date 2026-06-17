export type RoomType = 'square' | 'rectangle' | 'lShape';

export type FloorType = 'wood' | 'tile' | 'carpet';

export type FurnitureType = 'sofa' | 'coffeeTable' | 'bookshelf' | 'nightstand' | 'floorLamp';

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  name: string;
  width: number;
  height: number;
  color: string;
  x: number;
  y: number;
  rotation: number;
}

export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface RoomLayout {
  type: RoomType;
  name: string;
  area: number;
  walls: Wall[];
  floor: FloorType;
  windowPosition: { x: number; y: number; width: number; orientation: 'horizontal' | 'vertical' };
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface SavedLayout {
  id: string;
  name: string;
  thumbnail: string;
  roomType: RoomType;
  floorType: FloorType;
  furniture: FurnitureItem[];
  wallColors: Record<string, string>;
  createdAt: number;
}

export interface ColorPreset {
  name: string;
  value: string;
}

export interface ColorScheme {
  name: string;
  colors: string[];
}

export type DragData = {
  type: 'furniture';
  furniture: Omit<FurnitureItem, 'id' | 'x' | 'y'>;
} | {
  type: 'move';
  furnitureId: string;
  offsetX: number;
  offsetY: number;
};
