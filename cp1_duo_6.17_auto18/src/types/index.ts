export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export interface GradientConfig {
  stops: ColorStop[];
  angle: number;
}

export interface GradientTemplate {
  id: string;
  name: string;
  config: GradientConfig;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type PreviewShape = 'background' | 'circle' | 'text' | 'border' | 'stripes';

export type StripeDirection = 'horizontal' | 'vertical';
