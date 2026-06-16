import type { PixelFrame, PixelColor, FrameInfo } from '../types';
import { CANVAS_SIZE, cloneFrame } from '../types';

const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

const interpolateColor = (
  a: PixelColor,
  b: PixelColor,
  t: number
): PixelColor => {
  if (a.a === 0 && b.a === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
    a: Math.round(lerp(a.a, b.a, t)),
  };
};

const interpolateFrames = (
  frameA: PixelFrame,
  frameB: PixelFrame,
  t: number
): PixelFrame => {
  const result: PixelFrame = new Array(CANVAS_SIZE);
  for (let y = 0; y < CANVAS_SIZE; y++) {
    result[y] = new Array(CANVAS_SIZE);
    for (let x = 0; x < CANVAS_SIZE; x++) {
      result[y][x] = interpolateColor(frameA[y][x], frameB[y][x], t);
    }
  }
  return result;
};

export const generateTransitionFrames = (
  fromFrame: PixelFrame,
  toFrame: PixelFrame,
  transitionCount: number
): PixelFrame[] => {
  const frames: PixelFrame[] = [];
  const step = 1 / (transitionCount + 1);

  for (let i = 1; i <= transitionCount; i++) {
    const t = i * step;
    frames.push(interpolateFrames(fromFrame, toFrame, t));
  }

  return frames;
};

export const generateFullFrameSequence = (
  keyFrames: PixelFrame[],
  transitionFrames: number
): FrameInfo[] => {
  if (keyFrames.length === 0) return [];
  if (keyFrames.length === 1) {
    return [
      {
        frame: cloneFrame(keyFrames[0]),
        isKeyFrame: true,
        keyFrameIndex: 0,
      },
    ];
  }

  const sequence: FrameInfo[] = [];

  for (let i = 0; i < keyFrames.length; i++) {
    sequence.push({
      frame: cloneFrame(keyFrames[i]),
      isKeyFrame: true,
      keyFrameIndex: i,
    });

    if (i < keyFrames.length - 1) {
      const transitions = generateTransitionFrames(
        keyFrames[i],
        keyFrames[i + 1],
        transitionFrames
      );
      transitions.forEach((frame) => {
        sequence.push({
          frame,
          isKeyFrame: false,
        });
      });
    }
  }

  return sequence;
};

export const generateLoopedFrameSequence = (
  keyFrames: PixelFrame[],
  transitionFrames: number
): FrameInfo[] => {
  if (keyFrames.length === 0) return [];
  if (keyFrames.length === 1) {
    return [
      {
        frame: cloneFrame(keyFrames[0]),
        isKeyFrame: true,
        keyFrameIndex: 0,
      },
    ];
  }

  const loopedFrames = [...keyFrames, keyFrames[0]];
  return generateFullFrameSequence(loopedFrames, transitionFrames).slice(0, -1);
};
