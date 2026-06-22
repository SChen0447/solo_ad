export type AnimationType = 'translate' | 'rotate' | 'scale' | 'color' | 'bounce';

export type EasingType = 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';

export interface AnimationConfig {
  id: string;
  name: string;
  type: AnimationType;
  duration: number;
  delay: number;
  easing: EasingType;
  cubicBezier: [number, number, number, number];
  iterationCount: number | 'infinite';
}

export const ANIMATION_TYPE_LABELS: Record<AnimationType, string> = {
  translate: '平移',
  rotate: '旋转',
  scale: '缩放',
  color: '颜色渐变',
  bounce: '弹性弹跳',
};

export const EASING_OPTIONS: EasingType[] = [
  'ease',
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier',
];

export const EASING_LABELS: Record<EasingType, string> = {
  ease: 'ease',
  linear: 'linear',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  'cubic-bezier': '自定义贝塞尔',
};

export const createDefaultConfig = (id: string, name: string, type: AnimationType): AnimationConfig => ({
  id,
  name,
  type,
  duration: 1,
  delay: 0,
  easing: 'ease',
  cubicBezier: [0.42, 0, 0.58, 1],
  iterationCount: 'infinite',
});
