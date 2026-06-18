export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export type GradientType = 'linear' | 'radial';

export interface GradientScheme {
  id: string;
  name: string;
  colorStops: ColorStop[];
  gradientType: GradientType;
  angle: number;
}

export type EasingType = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'cubic-bezier';

export interface AnimationParams {
  duration: number;
  delay: number;
  easing: EasingType;
  cubicBezierValue: string;
}

export interface SavedScheme extends GradientScheme {
  animationParams: AnimationParams;
  createdAt: number;
}

export interface PresetTemplate {
  name: string;
  colors: string[];
  gradientType: GradientType;
}
