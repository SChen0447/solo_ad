export type NodeType = 'core' | 'attribute' | 'relation';

export type CameraMode = 'free' | 'focus';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ConceptNode {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  color: string;
  position: Vector3;
  velocity: Vector3;
  isFixed: boolean;
  createdAt: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  createdAt: number;
}

export interface ColorPaletteItem {
  name: string;
  value: string;
  glow: string;
}

export const COLOR_PALETTE: ColorPaletteItem[] = [
  { name: '珊瑚红', value: '#ff6b6b', glow: '#ff8787' },
  { name: '蜜桃橙', value: '#ffa94d', glow: '#ffb86b' },
  { name: '柠檬黄', value: '#ffd43b', glow: '#ffe066' },
  { name: '青草绿', value: '#51cf66', glow: '#69db7c' },
  { name: '薄荷青', value: '#20c997', glow: '#38d9a9' },
  { name: '天空蓝', value: '#339af0', glow: '#4dabf7' },
  { name: '宝石蓝', value: '#4c6ef5', glow: '#5c7cfa' },
  { name: '葡萄紫', value: '#9775fa', glow: '#b197fc' },
  { name: '蔷薇粉', value: '#f06595', glow: '#f783ac' },
  { name: '玫红色', value: '#e64980', glow: '#f06595' },
  { name: '冰青色', value: '#15aabf', glow: '#22b8cf' },
  { name: '银灰色', value: '#adb5bd', glow: '#ced4da' },
];
