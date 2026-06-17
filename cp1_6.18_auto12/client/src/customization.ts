import { CharacterCustomization } from './types';

export const HAIR_STYLES = [
  { id: 0, name: '短发' },
  { id: 1, name: '长发' },
  { id: 2, name: '莫西干' },
  { id: 3, name: '中分' },
  { id: 4, name: '光头' },
];

export const HAIR_COLORS = [
  '#2c1810',
  '#4a2c0a',
  '#d4a574',
  '#1a1a2e',
  '#e74c3c',
];

export const SHIRT_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
];

export const PANTS_COLORS = [
  '#2c3e50',
  '#34495e',
  '#1a5276',
  '#1e8449',
  '#6c3483',
];

export const SKIN_COLORS = [
  '#f5cba7',
  '#d4a574',
  '#a0522d',
  '#8b4513',
  '#deb887',
];

export const ACCESSORY_TYPES = [
  { id: 0, name: '无' },
  { id: 1, name: '眼镜' },
  { id: 2, name: '帽子' },
  { id: 3, name: '耳机' },
  { id: 4, name: '口罩' },
];

export const defaultCustomization: CharacterCustomization = {
  hairStyle: 0,
  hairColor: HAIR_COLORS[0],
  shirtColor: SHIRT_COLORS[0],
  pantsColor: PANTS_COLORS[0],
  skinColor: SKIN_COLORS[0],
  accessoryType: 0,
};

export const CUSTOMIZATION_OPTIONS = {
  hairStyle: HAIR_STYLES,
  hairColor: HAIR_COLORS.map((c, i) => ({ id: i, name: c, color: c })),
  shirtColor: SHIRT_COLORS.map((c, i) => ({ id: i, name: c, color: c })),
  pantsColor: PANTS_COLORS.map((c, i) => ({ id: i, name: c, color: c })),
  skinColor: SKIN_COLORS.map((c, i) => ({ id: i, name: c, color: c })),
  accessoryType: ACCESSORY_TYPES,
};
