export type ShapeType = 'rect' | 'circle' | 'triangle';

export type AnimationType = 'translate' | 'rotate' | 'scale';

export type EasingType = 'linear' | 'ease-in-out';

export type ConflictType = 'temporal' | 'spatial' | 'both';

export type ScheduleMode = 'none' | 'stagger' | 'degrade';

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  initialX: number;
  initialY: number;
  initialRotation: number;
  initialScale: number;
}

export interface AnimationTrack {
  id: string;
  shapeId: string;
  type: AnimationType;
  startTime: number;
  duration: number;
  endValue: number;
  easing: EasingType;
  priority: number;
  isActive: boolean;
}

export interface Conflict {
  id: string;
  shapeIds: string[];
  type: ConflictType;
  timeStart: number;
  timeEnd: number;
  trackIds: string[];
  suggestion: string;
}

export interface ShapeState {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
}
