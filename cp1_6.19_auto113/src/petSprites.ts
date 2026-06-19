import type { PetType, PetColorVariant } from './types';

export type ColorPalette = {
  body: string;
  bodyDark: string;
  belly: string;
  accent: string;
  eye: string;
  nose: string;
  outline: string;
};

export const PET_COLORS: Record<PetType, ColorPalette[]> = {
  cat: [
    { body: '#F5A962', bodyDark: '#E0893D', belly: '#FFE8CC', accent: '#FF8C69', eye: '#4A4A4A', nose: '#FF8FA3', outline: '#8B5A2B' },
    { body: '#A8A8A8', bodyDark: '#808080', belly: '#E0E0E0', accent: '#FFB6C1', eye: '#2C8C2C', nose: '#FF8FA3', outline: '#505050' },
    { body: '#2C2C2C', bodyDark: '#1A1A1A', belly: '#686868', accent: '#FFD700', eye: '#9370DB', nose: '#FF8FA3', outline: '#0A0A0A' },
  ],
  dog: [
    { body: '#D4A574', bodyDark: '#B08050', belly: '#F5E6CC', accent: '#6B4423', eye: '#3A2817', nose: '#2C1810', outline: '#8B5A2B' },
    { body: '#F0E6D0', bodyDark: '#C8B896', belly: '#FFFDF5', accent: '#A0522D', eye: '#4A3728', nose: '#2C1810', outline: '#8B7355' },
    { body: '#3C3C3C', bodyDark: '#282828', belly: '#787878', accent: '#C0C0C0', eye: '#1A1A1A', nose: '#0A0A0A', outline: '#1A1A1A' },
  ],
  dragon: [
    { body: '#7BC47F', bodyDark: '#4CAF50', belly: '#C8E6C9', accent: '#FF5722', eye: '#FFFFFF', nose: '#2E7D32', outline: '#1B5E20' },
    { body: '#CE93D8', bodyDark: '#9C27B0', belly: '#F3E5F5', accent: '#FFEB3B', eye: '#FFFFFF', nose: '#6A1B9A', outline: '#4A148C' },
    { body: '#FF8A65', bodyDark: '#E64A19', belly: '#FFCCBC', accent: '#64B5F6', eye: '#FFFFFF', nose: '#BF360C', outline: '#E65100' },
  ],
  rabbit: [
    { body: '#FAFAFA', bodyDark: '#E0E0E0', belly: '#FFFFFF', accent: '#FF8FA3', eye: '#E91E63', nose: '#FF8FA3', outline: '#BDBDBD' },
    { body: '#C8A278', bodyDark: '#A08050', belly: '#F0E0C0', accent: '#FF8FA3', eye: '#8B4513', nose: '#FF8FA3', outline: '#8B6914' },
    { body: '#2C2C2C', bodyDark: '#1A1A1A', belly: '#686868', accent: '#FF8FA3', eye: '#FF4081', nose: '#FF8FA3', outline: '#0A0A0A' },
  ],
  fox: [
    { body: '#FF7043', bodyDark: '#E64A19', belly: '#FFF3E0', accent: '#FFFFFF', eye: '#4A2C1A', nose: '#1A1A1A', outline: '#BF360C' },
    { body: '#8D6E63', bodyDark: '#5D4037', belly: '#D7CCC8', accent: '#FFFFFF', eye: '#3E2723', nose: '#1A1A1A', outline: '#3E2723' },
    { body: '#FFB74D', bodyDark: '#F57C00', belly: '#FFF8E1', accent: '#FFFFFF', eye: '#5D4037', nose: '#1A1A1A', outline: '#E65100' },
  ],
  bird: [
    { body: '#4FC3F7', bodyDark: '#0288D1', belly: '#B3E5FC', accent: '#FFC107', eye: '#FFFFFF', nose: '#FF9800', outline: '#01579B' },
    { body: '#F06292', bodyDark: '#C2185B', belly: '#FCE4EC', accent: '#FFEB3B', eye: '#FFFFFF', nose: '#FFC107', outline: '#880E4F' },
    { body: '#AED581', bodyDark: '#689F38', belly: '#DCEDC8', accent: '#FF9800', eye: '#FFFFFF', nose: '#FF5722', outline: '#33691E' },
  ],
};

const P: null = null;

type Pixel = string | null;

const makeCat = (c: ColorPalette): Pixel[][] => {
  const o = c.outline;
  const b = c.body;
  const d = c.bodyDark;
  const bl = c.belly;
  const e = c.eye;
  const n = c.nose;
  return [
    [P, P, o, o, P, P, P, P, o, o, P, P],
    [P, o, b, b, o, P, P, o, b, b, o, P],
    [o, b, d, b, b, o, o, b, b, d, b, o],
    [o, b, b, b, b, b, b, b, b, b, b, o],
    [o, b, e, b, b, b, b, b, b, e, b, o],
    [o, b, b, b, b, n, n, b, b, b, b, o],
    [o, b, b, b, b, b, b, b, b, b, b, o],
    [P, o, b, b, bl, bl, bl, bl, b, b, o, P],
    [P, o, b, bl, bl, bl, bl, bl, bl, b, o, P],
    [P, P, o, bl, bl, bl, bl, bl, bl, o, P, P],
    [P, P, o, b, P, P, P, P, b, o, P, P],
    [P, P, o, d, P, P, P, P, d, o, P, P],
  ];
};

const makeDog = (c: ColorPalette): Pixel[][] => {
  const o = c.outline;
  const b = c.body;
  const d = c.bodyDark;
  const bl = c.belly;
  const e = c.eye;
  const n = c.nose;
  return [
    [o, d, P, P, P, P, P, P, P, P, d, o],
    [o, d, d, o, P, P, P, P, o, d, d, o],
    [P, o, b, b, o, o, o, o, b, b, o, P],
    [P, o, b, b, b, b, b, b, b, b, o, P],
    [P, o, b, e, b, b, b, b, e, b, o, P],
    [P, o, b, b, b, n, n, b, b, b, o, P],
    [P, o, b, b, b, b, b, b, b, b, o, P],
    [P, P, o, b, bl, bl, bl, bl, b, o, P, P],
    [P, P, o, b, bl, bl, bl, bl, b, o, P, P],
    [P, P, P, o, bl, bl, bl, bl, o, P, P, P],
    [P, P, P, o, d, P, P, d, o, P, P, P],
    [P, P, P, o, d, P, P, d, o, P, P, P],
  ];
};

const makeDragon = (c: ColorPalette): Pixel[][] => {
  const o = c.outline;
  const b = c.body;
  const d = c.bodyDark;
  const bl = c.belly;
  const e = c.eye;
  const a = c.accent;
  return [
    [P, P, P, P, o, d, o, P, P, P, P, P],
    [P, P, P, o, b, b, b, o, P, P, P, P],
    [P, P, o, d, b, b, b, d, o, P, P, P],
    [P, o, b, b, b, e, e, b, b, o, P, a],
    [P, o, b, b, b, b, b, b, b, o, a, P],
    [P, o, b, b, b, o, o, b, b, o, P, P],
    [o, d, b, b, b, b, b, b, b, d, o, P],
    [o, b, b, bl, bl, bl, bl, bl, b, b, o, P],
    [o, b, bl, bl, bl, bl, bl, bl, bl, b, o, P],
    [o, d, bl, bl, bl, bl, bl, bl, bl, d, o, P],
    [P, o, d, P, o, d, d, o, P, d, o, P],
    [P, P, o, P, o, d, d, o, P, o, P, P],
  ];
};

const makeRabbit = (c: ColorPalette): Pixel[][] => {
  const o = c.outline;
  const b = c.body;
  const d = c.bodyDark;
  const bl = c.belly;
  const e = c.eye;
  const n = c.nose;
  return [
    [P, o, b, o, P, P, P, P, o, b, o, P],
    [P, o, b, b, o, P, P, o, b, b, o, P],
    [P, o, b, d, b, o, o, b, d, b, o, P],
    [P, P, o, b, b, b, b, b, b, o, P, P],
    [P, P, o, b, e, b, b, e, b, o, P, P],
    [P, P, o, b, b, n, n, b, b, o, P, P],
    [P, P, o, b, b, b, b, b, b, o, P, P],
    [P, o, b, b, bl, bl, bl, bl, b, b, o, P],
    [P, o, b, bl, bl, bl, bl, bl, bl, b, o, P],
    [P, P, o, bl, bl, bl, bl, bl, bl, o, P, P],
    [P, P, o, d, P, P, P, P, d, o, P, P],
    [P, P, o, d, P, P, P, P, d, o, P, P],
  ];
};

const makeFox = (c: ColorPalette): Pixel[][] => {
  const o = c.outline;
  const b = c.body;
  const d = c.bodyDark;
  const bl = c.belly;
  const e = c.eye;
  const n = c.nose;
  const a = c.accent;
  return [
    [o, d, P, P, P, P, P, P, P, P, d, o],
    [o, d, d, P, P, P, P, P, P, d, d, o],
    [P, o, b, b, o, P, P, o, b, b, o, P],
    [P, o, b, a, b, o, o, b, a, b, o, P],
    [P, o, b, a, e, b, b, e, a, b, o, P],
    [P, o, b, b, b, n, n, b, b, b, o, P],
    [P, P, o, b, b, b, b, b, b, o, P, P],
    [P, P, o, b, bl, bl, bl, bl, b, o, P, P],
    [P, P, o, b, bl, bl, bl, bl, b, o, d, d],
    [P, P, P, o, bl, bl, bl, bl, o, d, d, a],
    [P, P, P, o, d, P, P, d, o, P, P, P],
    [P, P, P, o, d, P, P, d, o, P, P, P],
  ];
};

const makeBird = (c: ColorPalette): Pixel[][] => {
  const o = c.outline;
  const b = c.body;
  const d = c.bodyDark;
  const bl = c.belly;
  const e = c.eye;
  const a = c.accent;
  return [
    [P, P, P, P, P, o, d, o, P, P, P, P],
    [P, P, P, P, o, d, d, d, o, P, P, P],
    [P, P, P, o, b, b, b, b, b, o, P, P],
    [P, P, o, b, b, b, b, b, b, b, o, P],
    [P, o, b, b, e, b, b, b, b, b, b, o],
    [o, b, b, b, b, o, o, b, b, b, b, a],
    [o, b, b, b, b, b, b, b, b, b, o, P],
    [o, b, d, b, bl, bl, bl, bl, b, o, P, P],
    [o, b, d, b, bl, bl, bl, bl, b, o, P, P],
    [P, o, d, bl, bl, bl, bl, bl, o, P, P, P],
    [P, P, o, d, P, P, P, d, o, P, P, P],
    [P, P, P, o, P, P, P, o, P, P, P, P],
  ];
};

const SPRITE_MAKERS: Record<PetType, (c: ColorPalette) => Pixel[][]> = {
  cat: makeCat,
  dog: makeDog,
  dragon: makeDragon,
  rabbit: makeRabbit,
  fox: makeFox,
  bird: makeBird,
};

export const PET_NAMES: Record<PetType, string> = {
  cat: '猫咪',
  dog: '狗狗',
  dragon: '小龙',
  rabbit: '兔兔',
  fox: '狐狸',
  bird: '小鸟',
};

export function getPetSprite(type: PetType, colorVariant: PetColorVariant): Pixel[][] {
  const palette = PET_COLORS[type][colorVariant];
  return SPRITE_MAKERS[type](palette);
}

export function getPetColors(type: PetType, colorVariant: PetColorVariant): ColorPalette {
  return PET_COLORS[type][colorVariant];
}
