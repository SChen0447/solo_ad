export interface PixelColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type PixelFrame = PixelColor[][];

export interface KeyFrame {
  id: string;
  index: number;
  pixels: PixelFrame;
  timestamp: number;
  isKeyFrame: boolean;
}

export type ToolType = 'brush' | 'eraser';

export interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
  fps: number;
  totalFrames: number;
}

export interface FrameInfo {
  frame: PixelFrame;
  isKeyFrame: boolean;
  keyFrameIndex?: number;
}

export const CANVAS_SIZE = 32;
export const SCALE_FACTOR = 16;
export const DEFAULT_TRANSITION_FRAMES = 5;
export const MIN_FPS = 1;
export const MAX_FPS = 10;
export const DEFAULT_FPS = 5;

export const COLOR_PALETTE: PixelColor[] = [
  { r: 0, g: 0, b: 0, a: 255 },
  { r: 255, g: 255, b: 255, a: 255 },
  { r: 255, g: 0, b: 0, a: 255 },
  { r: 0, g: 200, b: 0, a: 255 },
  { r: 0, g: 100, b: 255, a: 255 },
  { r: 255, g: 200, b: 0, a: 255 },
  { r: 255, g: 0, b: 255, a: 255 },
  { r: 255, g: 128, b: 0, a: 255 },
];

export const createEmptyFrame = (): PixelFrame => {
  return Array.from({ length: CANVAS_SIZE }, () =>
    Array.from({ length: CANVAS_SIZE }, () => ({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    }))
  );
};

export const cloneFrame = (frame: PixelFrame): PixelFrame => {
  return frame.map((row) => row.map((pixel) => ({ ...pixel })));
};

export const isColorEqual = (a: PixelColor, b: PixelColor): boolean => {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
};
