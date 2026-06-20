export type ShapeType = 'circle' | 'rectangle' | 'star' | 'bezier';

export interface Point {
  x: number;
  y: number;
}

export interface AnchorPoint {
  id: string;
  x: number;
  y: number;
  type: 'move' | 'control' | 'radius' | 'corner' | 'point';
}

export interface Shape {
  id: string;
  type: ShapeType;
  name: string;
  anchors: AnchorPoint[];
  stroke: string;
  strokeWidth: number;
  fill: string;
  transform: {
    x: number;
    y: number;
    rotation: number;
    scale: number;
  };
}

export type KeyframeProperty = 'position' | 'rotation' | 'scale' | 'strokeLength';

export interface Keyframe {
  id: string;
  shapeId: string;
  property: KeyframeProperty;
  time: number;
  value: number | Point;
  easing: string;
}

export interface AnimationState {
  shapes: Shape[];
  keyframes: Keyframe[];
  selectedShapeId: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
}
