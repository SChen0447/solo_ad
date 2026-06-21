import type { AnimationSlice } from '@/types';

interface KeyframePoint {
  position: number;
  transform: string;
  opacity: number;
}

interface ParsedSequence {
  sliceId: string;
  selector: string;
  keyframes: KeyframePoint[];
}

interface ParseMessage {
  type: 'PARSE';
  payload: AnimationSlice[];
}

const POSITIONS = [0, 0.25, 0.5, 0.75, 1];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function buildTransform(t: AnimationSlice['transform'], progress: number): string {
  const tx = lerp(0, t.translateX, progress);
  const ty = lerp(0, t.translateY, progress);
  const rot = lerp(0, t.rotate, progress);
  const sc = lerp(1, t.scale, progress);
  const sx = lerp(0, t.skewX, progress);
  const sy = lerp(0, t.skewY, progress);
  return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)}) skewX(${sx.toFixed(1)}deg) skewY(${sy.toFixed(1)}deg)`;
}

function parseSlices(slices: AnimationSlice[]): ParsedSequence[] {
  return slices.map((slice) => {
    const keyframes = POSITIONS.map((pos) => ({
      position: pos,
      transform: buildTransform(slice.transform, pos),
      opacity: lerp(1, slice.opacity, pos),
    }));
    return {
      sliceId: slice.id,
      selector: slice.selector,
      keyframes,
    };
  });
}

self.onmessage = (e: MessageEvent<ParseMessage>) => {
  if (e.data.type === 'PARSE') {
    const result = parseSlices(e.data.payload);
    self.postMessage({ type: 'PARSE_RESULT', payload: result });
  }
};
