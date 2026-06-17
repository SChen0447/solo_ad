import { useState, useCallback } from 'react';
import type { ColorPreset, ColorScheme } from '../types';

export const PRESET_COLORS: ColorPreset[] = [
  { name: '暖白', value: '#f5e6d0' },
  { name: '莫兰迪绿', value: '#a3b8a5' },
  { name: '雾霾蓝', value: '#b0c4de' },
  { name: '奶茶色', value: '#d2b48c' },
  { name: '深灰', value: '#4a4a4a' },
  { name: '珊瑚粉', value: '#f4a460' },
  { name: '芥末黄', value: '#d4b96a' },
  { name: '浅紫', value: '#c8b4d8' },
];

const COLOR_SCHEMES: ColorScheme[] = [
  { name: '奶油原木风', colors: ['#f5e6d0', '#d2b48c', '#d4b96a'] },
  { name: '莫兰迪自然风', colors: ['#a3b8a5', '#b0c4de', '#c8b4d8'] },
  { name: '高级灰调', colors: ['#4a4a4a', '#a3b8a5', '#b0c4de'] },
  { name: '暖调温馨风', colors: ['#f5e6d0', '#f4a460', '#d2b48c'] },
  { name: '清新马卡龙', colors: ['#b0c4de', '#c8b4d8', '#f4a460'] },
  { name: '简约北欧风', colors: ['#f5e6d0', '#a3b8a5', '#4a4a4a'] },
  { name: '复古暖调', colors: ['#d2b48c', '#d4b96a', '#f4a460'] },
  { name: '神秘紫调', colors: ['#c8b4d8', '#4a4a4a', '#b0c4de'] },
];

export const useColor = (initialColor: string = '#f5e6d0') => {
  const [color, setColor] = useState(initialColor);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeColor = useCallback((newColor: string) => {
    setIsTransitioning(true);
    setColor(newColor);
    setTimeout(() => setIsTransitioning(false), 300);
  }, []);

  return {
    color,
    setColor: changeColor,
    isTransitioning,
  };
};

export const applyColorTransition = (
  element: HTMLElement | null,
  targetColor: string,
  duration: number = 300
): void => {
  if (!element) return;
  
  element.style.transition = `background-color ${duration}ms ease`;
  requestAnimationFrame(() => {
    element.style.backgroundColor = targetColor;
  });
};

const colorDistance = (c1: string, c2: string): number => {
  const hex = (c: string) => c.replace('#', '');
  const r1 = parseInt(hex(c1).slice(0, 2), 16);
  const g1 = parseInt(hex(c1).slice(2, 4), 16);
  const b1 = parseInt(hex(c1).slice(4, 6), 16);
  const r2 = parseInt(hex(c2).slice(0, 2), 16);
  const g2 = parseInt(hex(c2).slice(2, 4), 16);
  const b2 = parseInt(hex(c2).slice(4, 6), 16);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
};

export const detectColorScheme = (wallColors: string[]): string => {
  if (wallColors.length === 0) return '未设置风格';

  let bestMatch: ColorScheme = COLOR_SCHEMES[0];
  let minDistance = Infinity;

  for (const scheme of COLOR_SCHEMES) {
    let totalDistance = 0;
    for (const wallColor of wallColors) {
      let closestSchemeColorDistance = Infinity;
      for (const schemeColor of scheme.colors) {
        const distance = colorDistance(wallColor, schemeColor);
        if (distance < closestSchemeColorDistance) {
          closestSchemeColorDistance = distance;
        }
      }
      totalDistance += closestSchemeColorDistance;
    }
    const avgDistance = totalDistance / wallColors.length;
    if (avgDistance < minDistance) {
      minDistance = avgDistance;
      bestMatch = scheme;
    }
  }

  return bestMatch.name;
};

export const getColorName = (hex: string): string => {
  const preset = PRESET_COLORS.find(p => p.value.toLowerCase() === hex.toLowerCase());
  return preset ? preset.name : hex;
};
