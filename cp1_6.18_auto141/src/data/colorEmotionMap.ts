export type ColorName = '红' | '橙' | '黄' | '绿' | '蓝' | '紫' | '粉' | '棕';

export interface ColorEmotion {
  name: ColorName;
  hex: string;
  emotion: string;
  description: string;
  story: string;
}

export const COLOR_EMOTION_MAP: ColorEmotion[] = [
  {
    name: '红',
    hex: '#E74C3C',
    emotion: '愤怒',
    description: '象征勇气与力量',
    story: '红色是火焰的颜色，代表着炽热的情感与无畏的勇气。在古老的传说中，战士们披上红色的战袍，以表达他们内心不可遏制的力量与决心。',
  },
  {
    name: '橙',
    hex: '#E67E22',
    emotion: '热情',
    description: '象征活力与创造',
    story: '橙色是日落的余晖，融合了红色的热烈与黄色的明快。它唤醒人们内心深处的创造力，让每一个平凡的日子都充满无限可能。',
  },
  {
    name: '黄',
    hex: '#F1C40F',
    emotion: '快乐',
    description: '象征阳光与希望',
    story: '黄色是阳光的化身，驱散阴霾与忧愁。当你沐浴在金色的光芒中，一切烦恼都变得微不足道，因为希望永远在前方等待。',
  },
  {
    name: '绿',
    hex: '#2ECC71',
    emotion: '平静',
    description: '象征自然与和谐',
    story: '绿色是大地的呼吸，是森林的低语。它带来一种深沉的宁静，仿佛置身于无边的原野，让心灵与自然合为一体。',
  },
  {
    name: '蓝',
    hex: '#3498DB',
    emotion: '宁静',
    description: '象征深邃与智慧',
    story: '蓝色是海洋与天空的交汇，蕴含着无尽的深邃。在蓝色的怀抱中，思绪如潮水般平静，智慧如星光般闪耀。',
  },
  {
    name: '紫',
    hex: '#9B59B6',
    emotion: '神秘',
    description: '象征灵性与直觉',
    story: '紫色是暮色中的面纱，是现实与梦幻的桥梁。它引导人们超越表象，探寻内心深处的灵性与直觉的力量。',
  },
  {
    name: '粉',
    hex: '#E91E8C',
    emotion: '温柔',
    description: '象征爱意与关怀',
    story: '粉色是花瓣上的晨露，是温柔的低语。它包裹着世间最柔软的情感，提醒我们用爱心对待身边的每一个人。',
  },
  {
    name: '棕',
    hex: '#8B6914',
    emotion: '稳重',
    description: '象征坚韧与可靠',
    story: '棕色是大地的脊梁，是百年老树的根基。它代表着坚定不移的意志与脚踏实地的态度，是风雨中永不动摇的力量。',
  },
];

export const ALL_COLORS = COLOR_EMOTION_MAP.map((c) => c.name);

export function getColorEmotion(name: ColorName): ColorEmotion {
  return COLOR_EMOTION_MAP.find((c) => c.name === name)!;
}

export function getHexByName(name: ColorName): string {
  return getColorEmotion(name).hex;
}
