export interface PhotoItem {
  id: string;
  thumbnailBase64: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
  label: string;
}

export interface TextBlock {
  id: string;
  content: string;
  x: number;
  y: number;
}

export interface MaterialPhoto {
  id: string;
  originalName: string;
  thumbnailBase64: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'simple',
    name: '简约白',
    backgroundColor: '#FDF5E6',
    textColor: '#2D3436',
    accentColor: '#2A9D8F',
    borderColor: '#E0D8C8',
  },
  {
    id: 'vintage',
    name: '复古黄',
    backgroundColor: '#F5E6CA',
    textColor: '#5D4037',
    accentColor: '#8D6E63',
    borderColor: '#D7C9A8',
  },
  {
    id: 'travel',
    name: '旅行蓝',
    backgroundColor: '#E3F2FD',
    textColor: '#1565C0',
    accentColor: '#42A5F5',
    borderColor: '#B0C4DE',
  },
  {
    id: 'forest',
    name: '森林绿',
    backgroundColor: '#E8F5E9',
    textColor: '#2E7D32',
    accentColor: '#66BB6A',
    borderColor: '#A5D6A7',
  },
  {
    id: 'sunset',
    name: '日落橙',
    backgroundColor: '#FFF3E0',
    textColor: '#E65100',
    accentColor: '#FF8A65',
    borderColor: '#FFCC80',
  },
];

export function getThemeById(id: string): ThemeConfig {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}
