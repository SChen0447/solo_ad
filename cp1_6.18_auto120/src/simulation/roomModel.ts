export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  label?: string;
}

export type SoundSourceType = 'point' | 'line';

export interface SoundSource {
  id: string;
  type: SoundSourceType;
  position: Point;
  endPosition?: Point;
  frequency: number;
  volume: number;
}

export interface RoomConfig {
  walls: Wall[];
  sources: SoundSource[];
  width: number;
  height: number;
}

export type PresetType = 'livingRoom' | 'trapezoidStudio' | 'lShapedTheater';

export function createWall(start: Point, end: Point, label?: string): Wall {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    start,
    end,
    label,
  };
}

export function createSoundSource(
  type: SoundSourceType,
  position: Point,
  endPosition?: Point
): SoundSource {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    position,
    endPosition,
    frequency: 440,
    volume: 80,
  };
}

export function wallLength(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function validateWalls(walls: Wall[]): boolean {
  if (walls.length < 3) return false;
  for (const wall of walls) {
    if (wallLength(wall) < 1) return false;
  }
  return true;
}

export function getWallNormal(wall: Wall): Point {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: -dy / len, y: dx / len };
}

export function getPresetConfig(preset: PresetType, canvasWidth: number, canvasHeight: number): RoomConfig {
  const margin = 60;
  const w = canvasWidth - margin * 2;
  const h = canvasHeight - margin * 2;

  switch (preset) {
    case 'livingRoom': {
      const tl = { x: margin, y: margin };
      const tr = { x: margin + w, y: margin };
      const br = { x: margin + w, y: margin + h };
      const bl = { x: margin, y: margin + h };
      const walls = [
        createWall(tl, tr, '北墙'),
        createWall(tr, br, '东墙'),
        createWall(br, bl, '南墙'),
        createWall(bl, tl, '西墙'),
      ];
      const source = createSoundSource('point', {
        x: margin + w * 0.4,
        y: margin + h * 0.6,
      });
      return { walls, sources: [source], width: canvasWidth, height: canvasHeight };
    }
    case 'trapezoidStudio': {
      const inset = w * 0.2;
      const tl = { x: margin + inset, y: margin };
      const tr = { x: margin + w - inset, y: margin };
      const br = { x: margin + w, y: margin + h };
      const bl = { x: margin, y: margin + h };
      const walls = [
        createWall(tl, tr, '北墙'),
        createWall(tr, br, '东墙'),
        createWall(br, bl, '南墙'),
        createWall(bl, tl, '西墙'),
      ];
      const source = createSoundSource('point', {
        x: margin + w * 0.5,
        y: margin + h * 0.35,
      });
      return { walls, sources: [source], width: canvasWidth, height: canvasHeight };
    }
    case 'lShapedTheater': {
      const hw = w * 0.55;
      const hh = h * 0.6;
      const p1 = { x: margin, y: margin };
      const p2 = { x: margin + w, y: margin };
      const p3 = { x: margin + w, y: margin + hh };
      const p4 = { x: margin + hw, y: margin + hh };
      const p5 = { x: margin + hw, y: margin + h };
      const p6 = { x: margin, y: margin + h };
      const walls = [
        createWall(p1, p2, '北墙'),
        createWall(p2, p3, '东墙上段'),
        createWall(p3, p4, '内角水平'),
        createWall(p4, p5, '内角垂直'),
        createWall(p5, p6, '南墙'),
        createWall(p6, p1, '西墙'),
      ];
      const source = createSoundSource('point', {
        x: margin + w * 0.5,
        y: margin + h * 0.3,
      });
      return { walls, sources: [source], width: canvasWidth, height: canvasHeight };
    }
  }
}
