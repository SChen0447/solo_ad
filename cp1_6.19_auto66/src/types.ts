export type FloorMaterial = 'wood' | 'carpet' | 'concrete';

export interface ExhibitionHall {
  id: string;
  name: string;
  width: number;
  depth: number;
  wallColor: string;
  floorMaterial: FloorMaterial;
}

export interface Artwork {
  id: string;
  name: string;
  artist: string;
  description: string;
  imageUrl: string;
}

export interface Frame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameColor: string;
  visible: boolean;
  isColliding: boolean;
  rotation: number;
  artwork: Artwork | null;
}

export interface PathNode {
  id: string;
  x: number;
  y: number;
  order: number;
}

export interface FrameTemplate {
  label: string;
  width: number;
  height: number;
}

export const SCALE = 50;

export const WALL_THICKNESS = 6;
export const WALL_SNAP_DISTANCE = 25;
export const FRAME_FRONT_CLEARANCE = 40;
export const GRID_SPACING = 40;
export const SHIFT_STEP = 5;

export const FRAME_TEMPLATES: FrameTemplate[] = [
  { label: '30×40cm', width: 15, height: 20 },
  { label: '50×70cm', width: 25, height: 35 },
  { label: '80×100cm', width: 40, height: 50 },
];

export const WALL_COLORS = [
  { label: '米白', value: '#F5F0E8' },
  { label: '浅灰', value: '#E8E0D8' },
  { label: '藏青', value: '#2C3E50' },
];

export const FLOOR_MATERIALS: { label: string; value: FloorMaterial }[] = [
  { label: '木纹', value: 'wood' },
  { label: '地毯', value: 'carpet' },
  { label: '水泥', value: 'concrete' },
];

export const DEFAULT_HALL: Omit<ExhibitionHall, 'id'> = {
  name: '新展览',
  width: 600,
  depth: 400,
  wallColor: '#F5F0E8',
  floorMaterial: 'wood',
};

export interface ExportData {
  hall: ExhibitionHall;
  frames: Frame[];
  pathNodes: PathNode[];
}
