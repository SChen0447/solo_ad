export type TemplateCategory = 'birthday' | 'holiday' | 'thanks' | 'wedding' | 'encouragement';

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
}

export type DecorationType = 'flower' | 'star' | 'heart' | 'balloon' | 'confetti';

export interface DecorationElement {
  id: string;
  type: 'decoration';
  shape: DecorationType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
}

export type CardElement = TextElement | DecorationElement;

export type BackgroundType = 'solid' | 'gradient' | 'image';

export interface BackgroundConfig {
  type: BackgroundType;
  value: string;
}

export interface CardTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  background: BackgroundConfig;
  primaryColor: string;
  secondaryColor: string;
  defaultTexts: TextElement[];
  defaultDecorations: DecorationElement[];
  previewGradient: string;
  icon: string;
}

export interface EditorState {
  template: CardTemplate | null;
  texts: TextElement[];
  decorations: DecorationElement[];
  background: BackgroundConfig;
  selectedElementId: string | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

export type PageType = 'home' | 'editor' | 'preview';
