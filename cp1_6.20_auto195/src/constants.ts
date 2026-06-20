import { PlantSpecies, CareStatus, TaskType } from './types';

export const SPECIES_CONFIG: Record<PlantSpecies, {
  icon: string;
  bgColor: string;
  textColor: string;
  waterFrequency: number;
  fertilizeFrequency: number;
  repotFrequency: number;
}> = {
  '绿萝': {
    icon: '🌿',
    bgColor: '#C8E6C9',
    textColor: '#2E7D32',
    waterFrequency: 3,
    fertilizeFrequency: 30,
    repotFrequency: 365
  },
  '多肉': {
    icon: '🌵',
    bgColor: '#FFE0B2',
    textColor: '#E65100',
    waterFrequency: 14,
    fertilizeFrequency: 60,
    repotFrequency: 545
  },
  '龟背竹': {
    icon: '🍃',
    bgColor: '#DCEDC8',
    textColor: '#558B2F',
    waterFrequency: 5,
    fertilizeFrequency: 21,
    repotFrequency: 365
  },
  '琴叶榕': {
    icon: '🌳',
    bgColor: '#D7CCC8',
    textColor: '#5D4037',
    waterFrequency: 7,
    fertilizeFrequency: 30,
    repotFrequency: 365
  },
  '蝴蝶兰': {
    icon: '🌸',
    bgColor: '#F8BBD0',
    textColor: '#C2185B',
    waterFrequency: 7,
    fertilizeFrequency: 14,
    repotFrequency: 730
  }
};

export const STATUS_COLORS: Record<CareStatus, {
  bg: string;
  text: string;
  label: string;
}> = {
  'healthy': {
    bg: '#E8F5E9',
    text: '#2E7D32',
    label: '健康'
  },
  'thirsty': {
    bg: '#FFF3E0',
    text: '#E65100',
    label: '缺水'
  },
  'low_light': {
    bg: '#E3F2FD',
    text: '#1565C0',
    label: '光照不足'
  }
};

export const TASK_COLORS: Record<TaskType, string> = {
  'water': '#4CAF50',
  'fertilize': '#FFC107',
  'repot': '#8D6E63'
};

export const TASK_LABELS: Record<TaskType, string> = {
  'water': '浇水',
  'fertilize': '施肥',
  'repot': '换土'
};

export const THEME = {
  primary: '#4CAF50',
  secondary: '#81C784',
  background: '#F1F8E9',
  text: '#2E7D32',
  textLight: '#66BB6A',
  border: '#C8E6C9',
  cardShadow: '0 2px 8px rgba(76, 175, 80, 0.15)'
};
