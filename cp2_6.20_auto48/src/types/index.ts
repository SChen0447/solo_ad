export type TemplateType = 'birthday' | 'holiday' | 'thankyou' | 'wedding' | 'encouragement';
export type DecorationShape = 'flower' | 'star' | 'heart';
export type BackgroundType = 'gradient' | 'image';

export interface CardElement {
  id: string;
  type: 'text' | 'decoration';
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface TextElement extends CardElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeWidth: number;
  strokeColor: string;
  shadowBlur: number;
  shadowColor: string;
}

export interface DecorationElement extends CardElement {
  type: 'decoration';
  shape: DecorationShape;
}

export type CardElementUnion = TextElement | DecorationElement;

export interface CardTemplate {
  id: string;
  name: string;
  type: TemplateType;
  gradientColors: [string, string];
  defaultText: string;
  icon: string;
}

export interface GradientPreset {
  name: string;
  colors: [string, string];
}
