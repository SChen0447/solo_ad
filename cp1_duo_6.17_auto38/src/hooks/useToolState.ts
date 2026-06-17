import { useState, useCallback } from 'react';
import type { ToolState } from '../types';

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function useToolState(initialColor = '#8B7355') {
  const [toolState, setToolState] = useState<ToolState>({
    color: initialColor,
    brushSize: 5,
    hue: 30,
    saturation: 25,
    lightness: 45,
  });

  const setColorFromHSL = useCallback((hue: number, saturation: number, lightness: number) => {
    const color = hslToHex(hue, saturation, lightness);
    setToolState((prev) => ({
      ...prev,
      color,
      hue,
      saturation,
      lightness,
    }));
  }, []);

  const setBrushSize = useCallback((size: number) => {
    setToolState((prev) => ({
      ...prev,
      brushSize: Math.max(1, Math.min(50, size)),
    }));
  }, []);

  const setColor = useCallback((color: string) => {
    setToolState((prev) => ({
      ...prev,
      color,
    }));
  }, []);

  return {
    toolState,
    setColorFromHSL,
    setBrushSize,
    setColor,
  };
}
