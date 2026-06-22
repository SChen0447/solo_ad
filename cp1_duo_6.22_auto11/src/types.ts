export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  shadowLevel: 'none' | 'light' | 'medium' | 'heavy';
  textAlign: 'left' | 'center' | 'right';
}

export interface CardRecord {
  id: string;
  imageUrl: string;
  croppedImageUrl: string;
  subtitleText: string;
  subtitleStyle: SubtitleStyle;
  templateName: string;
  exportFormat: 'png' | 'jpg';
  createdAt: number;
  thumbnailUrl: string;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovieTemplate {
  name: string;
  label: string;
  style: SubtitleStyle;
}

export const MOVIE_TEMPLATES: MovieTemplate[] = [
  {
    name: 'scifi',
    label: '科幻蓝光',
    style: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 32,
      fontColor: '#00d4ff',
      shadowLevel: 'heavy',
      textAlign: 'center',
    },
  },
  {
    name: 'retro',
    label: '复古胶片',
    style: {
      fontFamily: 'SimSun, 宋体, serif',
      fontSize: 28,
      fontColor: '#ffd700',
      shadowLevel: 'medium',
      textAlign: 'center',
    },
  },
  {
    name: 'silent',
    label: '黑白默片',
    style: {
      fontFamily: 'Georgia, serif',
      fontSize: 26,
      fontColor: '#ffffff',
      shadowLevel: 'none',
      textAlign: 'center',
    },
  },
  {
    name: 'matrix',
    label: '黑客帝国',
    style: {
      fontFamily: 'SimHei, 黑体, sans-serif',
      fontSize: 30,
      fontColor: '#00ff41',
      shadowLevel: 'heavy',
      textAlign: 'left',
    },
  },
  {
    name: 'titanic',
    label: '泰坦尼克',
    style: {
      fontFamily: 'KaiTi, 楷体, serif',
      fontSize: 28,
      fontColor: '#d4a574',
      shadowLevel: 'light',
      textAlign: 'center',
    },
  },
];

export const MOVIE_COLORS = [
  { name: '黑客帝国绿', value: '#00ff41' },
  { name: '泰坦尼克金', value: '#d4a574' },
  { name: '银翼杀手红', value: '#ff1744' },
  { name: '星际穿越蓝', value: '#00b0ff' },
  { name: '教父金', value: '#c9a858' },
  { name: '肖申克暖白', value: '#f5e6ca' },
  { name: '盗梦空间银', value: '#b0bec5' },
  { name: '阿甘正传绿', value: '#4caf50' },
  { name: '低俗小说黄', value: '#ffeb3b' },
  { name: '搏击俱乐部红', value: '#b71c1c' },
  { name: '2001太空蓝', value: '#1a237e' },
  { name: '卡萨布兰卡米', value: '#d7ccc8' },
  { name: '发条橙白', value: '#ffffff' },
  { name: '楚门天蓝', value: '#4fc3f7' },
  { name: '辛德勒暗红', value: '#880e4f' },
  { name: '雨中曲蓝', value: '#283593' },
  { name: '罗生门灰', value: '#9e9e9e' },
  { name: '大都会金', value: '#ffc107' },
  { name: '第七封印黑', value: '#212121' },
  { name: '公民凯恩深棕', value: '#5d4037' },
];

export const FONT_OPTIONS = [
  { label: '黑体', value: 'SimHei, 黑体, sans-serif' },
  { label: '宋体', value: 'SimSun, 宋体, serif' },
  { label: '楷体', value: 'KaiTi, 楷体, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
];

export const DEFAULT_STYLE: SubtitleStyle = {
  fontFamily: 'SimHei, 黑体, sans-serif',
  fontSize: 28,
  fontColor: '#ffffff',
  shadowLevel: 'medium',
  textAlign: 'center',
};
