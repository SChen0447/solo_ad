export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image';
  color?: string;
  gradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle?: number;
  };
  imageUrl?: string;
}

export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeWidth: number;
  strokeColor: string;
  shadowBlur: number;
  shadowColor: string;
  rotation: number;
}

export interface DecorationElement {
  id: string;
  type: 'decoration';
  shape: 'flower' | 'star' | 'heart' | 'balloon' | 'confetti';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
}

export type CardElement = TextElement | DecorationElement;

export interface CardTemplate {
  id: string;
  name: string;
  category: 'birthday' | 'festival' | 'thanks' | 'wedding' | 'encouragement';
  background: BackgroundConfig;
  defaultTexts: Omit<TextElement, 'id'>[];
  defaultDecorations: Omit<DecorationElement, 'id'>[];
  previewColor: string;
  icon: string;
}

export interface CardState {
  background: BackgroundConfig;
  elements: CardElement[];
  selectedElementId: string | null;
}

export interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
  angle: number;
}

export const FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Courier New',
  'Microsoft YaHei',
  'SimHei',
  'KaiTi',
];

export const DECORATION_SHAPES: Array<{ shape: DecorationElement['shape']; name: string; icon: string }> = [
  { shape: 'flower', name: '花朵', icon: '🌸' },
  { shape: 'star', name: '星星', icon: '⭐' },
  { shape: 'heart', name: '心形', icon: '❤️' },
  { shape: 'balloon', name: '气球', icon: '🎈' },
  { shape: 'confetti', name: '彩带', icon: '🎉' },
];

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'sunrise', name: '日出橙粉', colors: ['#FF9A9E', '#FECFEF'], angle: 135 },
  { id: 'ocean', name: '海洋蓝绿', colors: ['#A8D8EA', '#88D8B0'], angle: 135 },
  { id: 'forest', name: '森林翠绿', colors: ['#56AB2F', '#A8E063'], angle: 135 },
  { id: 'starry', name: '星空深蓝', colors: ['#0F0C29', '#302B63', '#24243E'], angle: 135 },
  { id: 'sunset', name: '日落紫红', colors: ['#FC466B', '#3F5EFB'], angle: 135 },
];

export const TEMPLATES: CardTemplate[] = [
  {
    id: 'birthday',
    name: '生日祝福',
    category: 'birthday',
    previewColor: '#FFB6C1',
    icon: '🎂',
    background: {
      type: 'gradient',
      gradient: { type: 'linear', colors: ['#FFE5E5', '#FFB6C1'], angle: 135 },
    },
    defaultTexts: [
      {
        type: 'text',
        content: '生日快乐！',
        x: 400,
        y: 250,
        fontSize: 48,
        fontFamily: 'Georgia',
        color: '#FF6B6B',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 4,
        shadowColor: 'rgba(0,0,0,0.3)',
        rotation: 0,
      },
      {
        type: 'text',
        content: '愿你每一天都充满欢笑',
        x: 400,
        y: 350,
        fontSize: 24,
        fontFamily: 'Microsoft YaHei',
        color: '#666666',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0)',
        rotation: 0,
      },
    ],
    defaultDecorations: [
      { type: 'decoration', shape: 'balloon', x: 150, y: 150, scale: 1, rotation: 0, color: '#FF6B6B' },
      { type: 'decoration', shape: 'star', x: 650, y: 120, scale: 0.8, rotation: 15, color: '#FFD93D' },
      { type: 'decoration', shape: 'heart', x: 680, y: 480, scale: 0.9, rotation: 0, color: '#FF8FA3' },
    ],
  },
  {
    id: 'festival',
    name: '节日祝福',
    category: 'festival',
    previewColor: '#FFD93D',
    icon: '🎄',
    background: {
      type: 'gradient',
      gradient: { type: 'linear', colors: ['#E8F5E9', '#A5D6A7'], angle: 135 },
    },
    defaultTexts: [
      {
        type: 'text',
        content: '节日快乐！',
        x: 400,
        y: 280,
        fontSize: 52,
        fontFamily: 'Georgia',
        color: '#2E7D32',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 5,
        shadowColor: 'rgba(0,0,0,0.2)',
        rotation: 0,
      },
      {
        type: 'text',
        content: '愿幸福与你同在',
        x: 400,
        y: 380,
        fontSize: 24,
        fontFamily: 'Microsoft YaHei',
        color: '#558B2F',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0)',
        rotation: 0,
      },
    ],
    defaultDecorations: [
      { type: 'decoration', shape: 'star', x: 120, y: 100, scale: 1.2, rotation: 0, color: '#FFD700' },
      { type: 'decoration', shape: 'confetti', x: 680, y: 150, scale: 1, rotation: 30, color: '#FF6B6B' },
      { type: 'decoration', shape: 'flower', x: 150, y: 500, scale: 0.8, rotation: 0, color: '#E91E63' },
    ],
  },
  {
    id: 'thanks',
    name: '感谢卡',
    category: 'thanks',
    previewColor: '#81D4FA',
    icon: '💌',
    background: {
      type: 'gradient',
      gradient: { type: 'linear', colors: ['#E3F2FD', '#81D4FA'], angle: 135 },
    },
    defaultTexts: [
      {
        type: 'text',
        content: '感谢有你',
        x: 400,
        y: 260,
        fontSize: 48,
        fontFamily: 'Georgia',
        color: '#1565C0',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 4,
        shadowColor: 'rgba(0,0,0,0.2)',
        rotation: 0,
      },
      {
        type: 'text',
        content: '谢谢你一直以来的支持',
        x: 400,
        y: 360,
        fontSize: 22,
        fontFamily: 'Microsoft YaHei',
        color: '#424242',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0)',
        rotation: 0,
      },
    ],
    defaultDecorations: [
      { type: 'decoration', shape: 'heart', x: 200, y: 150, scale: 1, rotation: 0, color: '#E91E63' },
      { type: 'decoration', shape: 'flower', x: 600, y: 450, scale: 0.9, rotation: 15, color: '#FF8A65' },
      { type: 'decoration', shape: 'heart', x: 650, y: 180, scale: 0.7, rotation: 0, color: '#F48FB1' },
    ],
  },
  {
    id: 'wedding',
    name: '结婚祝福',
    category: 'wedding',
    previewColor: '#F8BBD9',
    icon: '💒',
    background: {
      type: 'gradient',
      gradient: { type: 'linear', colors: ['#FCE4EC', '#F8BBD9'], angle: 135 },
    },
    defaultTexts: [
      {
        type: 'text',
        content: '百年好合',
        x: 400,
        y: 250,
        fontSize: 56,
        fontFamily: 'KaiTi',
        color: '#C2185B',
        strokeWidth: 1,
        strokeColor: '#880E4F',
        shadowBlur: 6,
        shadowColor: 'rgba(194,24,91,0.3)',
        rotation: 0,
      },
      {
        type: 'text',
        content: '永结同心，早生贵子',
        x: 400,
        y: 360,
        fontSize: 24,
        fontFamily: 'KaiTi',
        color: '#AD1457',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0)',
        rotation: 0,
      },
    ],
    defaultDecorations: [
      { type: 'decoration', shape: 'heart', x: 150, y: 200, scale: 1.2, rotation: 0, color: '#E91E63' },
      { type: 'decoration', shape: 'heart', x: 650, y: 200, scale: 1.2, rotation: 0, color: '#E91E63' },
      { type: 'decoration', shape: 'flower', x: 400, y: 500, scale: 1, rotation: 0, color: '#FF80AB' },
    ],
  },
  {
    id: 'encouragement',
    name: '鼓励卡',
    category: 'encouragement',
    previewColor: '#FFE082',
    icon: '💪',
    background: {
      type: 'gradient',
      gradient: { type: 'linear', colors: ['#FFF8E1', '#FFE082'], angle: 135 },
    },
    defaultTexts: [
      {
        type: 'text',
        content: '加油！',
        x: 400,
        y: 260,
        fontSize: 64,
        fontFamily: 'Georgia',
        color: '#FF8F00',
        strokeWidth: 2,
        strokeColor: '#E65100',
        shadowBlur: 8,
        shadowColor: 'rgba(255,143,0,0.4)',
        rotation: -5,
      },
      {
        type: 'text',
        content: '你一定可以的！',
        x: 400,
        y: 380,
        fontSize: 28,
        fontFamily: 'Microsoft YaHei',
        color: '#EF6C00',
        strokeWidth: 0,
        strokeColor: '#000000',
        shadowBlur: 0,
        shadowColor: 'rgba(0,0,0,0)',
        rotation: 0,
      },
    ],
    defaultDecorations: [
      { type: 'decoration', shape: 'star', x: 180, y: 150, scale: 1.1, rotation: 20, color: '#FFD700' },
      { type: 'decoration', shape: 'star', x: 620, y: 180, scale: 0.9, rotation: -15, color: '#FFA000' },
      { type: 'decoration', shape: 'confetti', x: 650, y: 480, scale: 1, rotation: 0, color: '#FF6F00' },
    ],
  },
];

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
