export type FieldType = 'gravity' | 'magnetic' | 'elastic';

export interface Vector2 {
  x: number;
  y: number;
}

export interface ForceField {
  id: string;
  type: FieldType;
  position: Vector2;
  strength: number;
  angle: number;
  radius: number;
}

export interface Ball {
  position: Vector2;
  velocity: Vector2;
  radius: number;
  mass: number;
}

export interface TargetZone {
  type: 'circle' | 'rectangle';
  position: Vector2;
  size: {
    width?: number;
    height?: number;
    radius?: number;
  };
}

export interface Level {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  ballStart: Vector2;
  initialVelocity: Vector2;
  target: TargetZone;
  fields: ForceField[];
}

export interface PhysicsData {
  velocity: number;
  acceleration: number;
  netForce: Vector2;
  forceMagnitude: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  maxRadius: number;
  color: string;
}

export const FIELD_COLORS: Record<FieldType, { bg: string; border: string; gradient: string[] }> = {
  gravity: {
    bg: 'rgba(255, 165, 0, 0.25)',
    border: 'rgba(255, 165, 0, 0.8)',
    gradient: ['rgba(255, 200, 80, 0.35)', 'rgba(255, 120, 0, 0.15)'],
  },
  magnetic: {
    bg: 'rgba(0, 120, 255, 0.25)',
    border: 'rgba(0, 120, 255, 0.8)',
    gradient: ['rgba(80, 180, 255, 0.35)', 'rgba(0, 80, 200, 0.15)'],
  },
  elastic: {
    bg: 'rgba(0, 200, 80, 0.25)',
    border: 'rgba(0, 200, 80, 0.8)',
    gradient: ['rgba(80, 255, 150, 0.35)', 'rgba(0, 150, 50, 0.15)'],
  },
};

export const FIELD_RANGES: Record<FieldType, { min: number; max: number; default: number; unit: string }> = {
  gravity: { min: 5, max: 20, default: 12, unit: 'm/s²' },
  magnetic: { min: 10, max: 50, default: 30, unit: 'N' },
  elastic: { min: 50, max: 200, default: 120, unit: 'N/m' },
};

export const FIELD_LABELS: Record<FieldType, string> = {
  gravity: '重力场',
  magnetic: '磁力场',
  elastic: '弹力场',
};
