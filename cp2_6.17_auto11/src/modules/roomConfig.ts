import type { RoomType, FloorType, RoomLayout, Wall, FurnitureItem } from '../types';

export const SCALE = 20;
export const GRID_SIZE = 25;
export const WALL_THICKNESS = 15;
export const WALL_COLOR_DEFAULT = '#f5e6d0';

export const snapToGrid = (value: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};

const createWall = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  position: Wall['position']
): Wall => ({
  id,
  x,
  y,
  width,
  height,
  color: WALL_COLOR_DEFAULT,
  position,
});

const getWallsForSquare = (canvasWidth: number, canvasHeight: number): Wall[] => {
  const innerW = canvasWidth - WALL_THICKNESS * 2;
  const innerH = canvasHeight - WALL_THICKNESS * 2;
  return [
    createWall('top', WALL_THICKNESS, 0, innerW, WALL_THICKNESS, 'top'),
    createWall('bottom', WALL_THICKNESS, canvasHeight - WALL_THICKNESS, innerW, WALL_THICKNESS, 'bottom'),
    createWall('left', 0, WALL_THICKNESS, WALL_THICKNESS, innerH, 'left'),
    createWall('right', canvasWidth - WALL_THICKNESS, WALL_THICKNESS, WALL_THICKNESS, innerH, 'right'),
  ];
};

const getWallsForRectangle = (canvasWidth: number, canvasHeight: number): Wall[] => {
  const innerW = canvasWidth - WALL_THICKNESS * 2;
  const innerH = canvasHeight - WALL_THICKNESS * 2;
  return [
    createWall('top', WALL_THICKNESS, 0, innerW, WALL_THICKNESS, 'top'),
    createWall('bottom', WALL_THICKNESS, canvasHeight - WALL_THICKNESS, innerW, WALL_THICKNESS, 'bottom'),
    createWall('left', 0, WALL_THICKNESS, WALL_THICKNESS, innerH, 'left'),
    createWall('right', canvasWidth - WALL_THICKNESS, WALL_THICKNESS, WALL_THICKNESS, innerH, 'right'),
  ];
};

const getWallsForLShape = (canvasWidth: number, canvasHeight: number): Wall[] => {
  const innerW = canvasWidth - WALL_THICKNESS * 2;
  const innerH = canvasHeight - WALL_THICKNESS * 2;
  const cutoutSize = innerH * 0.4;
  return [
    createWall('top', WALL_THICKNESS, 0, innerW, WALL_THICKNESS, 'top'),
    createWall('bottom', WALL_THICKNESS, canvasHeight - WALL_THICKNESS, innerW, WALL_THICKNESS, 'bottom'),
    createWall('left', 0, WALL_THICKNESS, WALL_THICKNESS, innerH, 'left'),
    createWall('right-upper', canvasWidth - WALL_THICKNESS, WALL_THICKNESS, WALL_THICKNESS, innerH - cutoutSize, 'right'),
    createWall('right-lower', canvasWidth - WALL_THICKNESS, canvasHeight - WALL_THICKNESS - cutoutSize, WALL_THICKNESS, cutoutSize, 'right'),
    createWall('inner-vertical', canvasWidth - WALL_THICKNESS - cutoutSize, canvasHeight - WALL_THICKNESS - cutoutSize, WALL_THICKNESS, cutoutSize, 'left'),
    createWall('inner-horizontal', canvasWidth - WALL_THICKNESS - cutoutSize, canvasHeight - WALL_THICKNESS - cutoutSize, cutoutSize, WALL_THICKNESS, 'top'),
  ];
};

const roomConfigs: Record<RoomType, { name: string; area: number; width: number; height: number }> = {
  square: { name: '正方形', area: 12, width: 600, height: 600 },
  rectangle: { name: '长方形', area: 20, width: 750, height: 500 },
  lShape: { name: 'L形', area: 18, width: 700, height: 600 },
};

const floorPatterns: Record<FloorType, { name: string; pattern: string }> = {
  wood: { name: '仿木纹地板', pattern: 'repeating-linear-gradient(90deg, #d4a574 0px, #c4956a 10px, #d4a574 20px)' },
  tile: { name: '灰色瓷砖', pattern: 'repeating-linear-gradient(0deg, #9ca3af 0px, #9ca3af 49px, #6b7280 49px, #6b7280 50px), repeating-linear-gradient(90deg, #9ca3af 0px, #9ca3af 49px, #6b7280 49px, #6b7280 50px)' },
  carpet: { name: '浅色地毯', pattern: 'radial-gradient(circle at 25% 25%, #f3f4f6 2px, transparent 2px), radial-gradient(circle at 75% 75%, #e5e7eb 2px, transparent 2px), linear-gradient(#f9fafb, #f3f4f6)' },
};

export const getRoomLayout = (type: RoomType, floorType: FloorType = 'wood'): RoomLayout => {
  const config = roomConfigs[type];
  const walls = type === 'square' 
    ? getWallsForSquare(config.width, config.height)
    : type === 'rectangle'
    ? getWallsForRectangle(config.width, config.height)
    : getWallsForLShape(config.width, config.height);

  const windowPositions: Record<RoomType, RoomLayout['windowPosition']> = {
    square: { x: 200, y: 0, width: 200, orientation: 'horizontal' },
    rectangle: { x: 250, y: 0, width: 250, orientation: 'horizontal' },
    lShape: { x: 150, y: 0, width: 200, orientation: 'horizontal' },
  };

  return {
    type,
    name: config.name,
    area: config.area,
    walls,
    floor: floorType,
    windowPosition: windowPositions[type],
    scale: SCALE,
    canvasWidth: config.width,
    canvasHeight: config.height,
  };
};

export const getFloorPattern = (type: FloorType): string => {
  return floorPatterns[type].pattern;
};

export const getFloorName = (type: FloorType): string => {
  return floorPatterns[type].name;
};

export const getRoomOptions = (): { value: RoomType; label: string; area: number }[] => {
  return Object.entries(roomConfigs).map(([value, config]) => ({
    value: value as RoomType,
    label: config.name,
    area: config.area,
  }));
};

export const getFloorOptions = (): { value: FloorType; label: string }[] => {
  return Object.entries(floorPatterns).map(([value, config]) => ({
    value: value as FloorType,
    label: config.name,
  }));
};

const furnitureTemplates: Omit<FurnitureItem, 'id' | 'x' | 'y'>[] = [
  { type: 'sofa', name: '三人沙发', width: 200, height: 80, color: '#8b7355', rotation: 0 },
  { type: 'coffeeTable', name: '茶几', width: 100, height: 50, color: '#a0522d', rotation: 0 },
  { type: 'bookshelf', name: '书架', width: 80, height: 30, color: '#6b4423', rotation: 0 },
  { type: 'nightstand', name: '床头柜', width: 45, height: 40, color: '#8b6914', rotation: 0 },
  { type: 'floorLamp', name: '落地灯', width: 35, height: 35, color: '#2c2c2c', rotation: 0 },
];

export const getFurnitureList = (): Omit<FurnitureItem, 'id' | 'x' | 'y'>[] => {
  return furnitureTemplates.map(f => ({ ...f }));
};

export const getFurnitureTemplate = (type: FurnitureItem['type']): Omit<FurnitureItem, 'id' | 'x' | 'y'> | undefined => {
  return furnitureTemplates.find(f => f.type === type);
};

export const isInRoomBounds = (x: number, y: number, width: number, height: number, layout: RoomLayout): boolean => {
  const padding = WALL_THICKNESS;
  return (
    x >= padding &&
    y >= padding &&
    x + width <= layout.canvasWidth - padding &&
    y + height <= layout.canvasHeight - padding
  );
};
