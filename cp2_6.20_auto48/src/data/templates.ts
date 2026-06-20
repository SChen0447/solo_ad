import type { CardTemplate, GradientPreset } from '@/types';

export const templates: CardTemplate[] = [
  {
    id: 'birthday',
    name: '生日快乐',
    type: 'birthday',
    gradientColors: ['#FF9A9E', '#FECFEF'],
    defaultText: '生日快乐！',
    icon: '🎂',
  },
  {
    id: 'holiday',
    name: '节日祝福',
    type: 'holiday',
    gradientColors: ['#43E97B', '#38F9D7'],
    defaultText: '节日快乐！',
    icon: '🎄',
  },
  {
    id: 'thankyou',
    name: '感恩感谢',
    type: 'thankyou',
    gradientColors: ['#FA709A', '#FEE140'],
    defaultText: '谢谢你！',
    icon: '🌻',
  },
  {
    id: 'wedding',
    name: '新婚祝福',
    type: 'wedding',
    gradientColors: ['#F6D365', '#FDA085'],
    defaultText: '新婚快乐！',
    icon: '💍',
  },
  {
    id: 'encouragement',
    name: '加油鼓励',
    type: 'encouragement',
    gradientColors: ['#667EEA', '#764BA2'],
    defaultText: '加油！你是最棒的！',
    icon: '🌟',
  },
];

export const gradientPresets: GradientPreset[] = [
  { name: '日出橙粉', colors: ['#FF9A9E', '#FECFEF'] },
  { name: '海洋蓝绿', colors: ['#43E97B', '#38F9D7'] },
  { name: '森林翠绿', colors: ['#11998E', '#38EF7D'] },
  { name: '星空深蓝', colors: ['#0C3483', '#A2B6DF'] },
  { name: '日落紫红', colors: ['#EE9CA7', '#FFDDE1'] },
];

export const fontOptions = [
  'Quicksand',
  'Noto Sans SC',
  'Georgia',
  'Courier New',
  'Verdana',
];
