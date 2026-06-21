import type { PaletteColor, PixelColor } from '../types';

function hexToRgb(hex: string): PixelColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255,
      }
    : { r: 0, g: 0, b: 0, a: 255 };
}

export const PALETTE: PaletteColor[] = [
  { hex: '#ff6b6b', rgb: hexToRgb('#ff6b6b'), group: 'warm' },
  { hex: '#ee5a24', rgb: hexToRgb('#ee5a24'), group: 'warm' },
  { hex: '#f39c12', rgb: hexToRgb('#f39c12'), group: 'warm' },
  { hex: '#f1c40f', rgb: hexToRgb('#f1c40f'), group: 'warm' },
  { hex: '#e74c3c', rgb: hexToRgb('#e74c3c'), group: 'warm' },
  { hex: '#c0392b', rgb: hexToRgb('#c0392b'), group: 'warm' },
  { hex: '#ff9ff3', rgb: hexToRgb('#ff9ff3'), group: 'warm' },
  { hex: '#feca57', rgb: hexToRgb('#feca57'), group: 'warm' },

  { hex: '#48dbfb', rgb: hexToRgb('#48dbfb'), group: 'cool' },
  { hex: '#0abde3', rgb: hexToRgb('#0abde3'), group: 'cool' },
  { hex: '#54a0ff', rgb: hexToRgb('#54a0ff'), group: 'cool' },
  { hex: '#2e86de', rgb: hexToRgb('#2e86de'), group: 'cool' },
  { hex: '#5f27cd', rgb: hexToRgb('#5f27cd'), group: 'cool' },
  { hex: '#341f97', rgb: hexToRgb('#341f97'), group: 'cool' },
  { hex: '#00d2d3', rgb: hexToRgb('#00d2d3'), group: 'cool' },
  { hex: '#01a3a4', rgb: hexToRgb('#01a3a4'), group: 'cool' },

  { hex: '#8b7355', rgb: hexToRgb('#8b7355'), group: 'earth' },
  { hex: '#6b4423', rgb: hexToRgb('#6b4423'), group: 'earth' },
  { hex: '#a0522d', rgb: hexToRgb('#a0522d'), group: 'earth' },
  { hex: '#cd853f', rgb: hexToRgb('#cd853f'), group: 'earth' },
  { hex: '#deb887', rgb: hexToRgb('#deb887'), group: 'earth' },
  { hex: '#d2b48c', rgb: hexToRgb('#d2b48c'), group: 'earth' },
  { hex: '#228b22', rgb: hexToRgb('#228b22'), group: 'earth' },
  { hex: '#32cd32', rgb: hexToRgb('#32cd32'), group: 'earth' },

  { hex: '#7f8c8d', rgb: hexToRgb('#7f8c8d'), group: 'metal' },
  { hex: '#95a5a6', rgb: hexToRgb('#95a5a6'), group: 'metal' },
  { hex: '#bdc3c7', rgb: hexToRgb('#bdc3c7'), group: 'metal' },
  { hex: '#ecf0f1', rgb: hexToRgb('#ecf0f1'), group: 'metal' },
  { hex: '#f39c12', rgb: hexToRgb('#f39c12'), group: 'metal' },
  { hex: '#d68910', rgb: hexToRgb('#d68910'), group: 'metal' },
  { hex: '#b7950b', rgb: hexToRgb('#b7950b'), group: 'metal' },
  { hex: '#7d6608', rgb: hexToRgb('#7d6608'), group: 'metal' },
];

export const getColorByHex = (hex: string): PaletteColor | undefined => {
  return PALETTE.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
};

export const getColorsByGroup = (group: 'warm' | 'cool' | 'earth' | 'metal'): PaletteColor[] => {
  return PALETTE.filter((c) => c.group === group);
};
