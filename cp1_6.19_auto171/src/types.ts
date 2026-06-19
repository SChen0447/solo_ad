export type AnimationTarget = 'square' | 'circle' | 'both';

export type AnimationType = 'rotate' | 'bounce' | 'fade' | 'pulse' | 'shake';

export type EasingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  | 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  | 'cubic-bezier(0.23, 1, 0.32, 1)'
  | 'cubic-bezier(0.445, 0.05, 0.55, 0.95)'
  | 'cubic-bezier(0.55, 0.055, 0.675, 0.19)'
  | 'cubic-bezier(0.215, 0.61, 0.355, 1)'
  | 'cubic-bezier(0.645, 0.045, 0.355, 1)'
  | 'custom';

export type AnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';

export interface AnimationParams {
  duration: number;
  easing: EasingFunction;
  customEasing: string;
  delay: number;
  iterationCount: number | 'infinite';
  direction: AnimationDirection;
}

export interface ElementParams {
  square: AnimationParams;
  circle: AnimationParams;
}

export interface AppState {
  target: AnimationTarget;
  params: ElementParams;
}

export const DEFAULT_PARAMS: AnimationParams = {
  duration: 1,
  easing: 'ease',
  customEasing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  delay: 0,
  iterationCount: 'infinite',
  direction: 'normal',
};

export const EASING_OPTIONS: { label: string; value: EasingFunction }[] = [
  { label: 'linear', value: 'linear' },
  { label: 'ease', value: 'ease' },
  { label: 'ease-in', value: 'ease-in' },
  { label: 'ease-out', value: 'ease-out' },
  { label: 'ease-in-out', value: 'ease-in-out' },
  { label: 'Back (Out)', value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' },
  { label: 'Back (In)', value: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  { label: 'Expo (Out)', value: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  { label: 'Expo (In)', value: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)' },
  { label: 'Expo (InOut)', value: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)' },
  { label: 'Cubic (Out)', value: 'cubic-bezier(0.215, 0.61, 0.355, 1)' },
  { label: 'Cubic (In)', value: 'cubic-bezier(0.645, 0.045, 0.355, 1)' },
  { label: '自定义 cubic-bezier', value: 'custom' },
];

export interface Preset {
  name: string;
  params: Partial<AnimationParams>;
}

export const PRESETS: Preset[] = [
  {
    name: '快速弹跳',
    params: {
      duration: 0.5,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      delay: 0,
      iterationCount: 'infinite',
      direction: 'alternate',
    },
  },
  {
    name: '慢速渐入',
    params: {
      duration: 3,
      easing: 'ease-in',
      delay: 0,
      iterationCount: 1,
      direction: 'normal',
    },
  },
  {
    name: '闪烁',
    params: {
      duration: 0.3,
      easing: 'ease-in-out',
      delay: 0,
      iterationCount: 'infinite',
      direction: 'alternate',
    },
  },
  {
    name: '旋转',
    params: {
      duration: 2,
      easing: 'linear',
      delay: 0,
      iterationCount: 'infinite',
      direction: 'normal',
    },
  },
  {
    name: '弹性',
    params: {
      duration: 1.2,
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      delay: 0,
      iterationCount: 'infinite',
      direction: 'alternate',
    },
  },
];
