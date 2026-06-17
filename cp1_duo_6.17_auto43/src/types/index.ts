export interface IParams {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  containerWidth: number;
}

export interface IFontOption {
  name: string;
  value: string;
  category: 'chinese' | 'english';
  googleFontFamily?: string;
}

export type SliderType = 'fontSize' | 'lineHeight' | 'letterSpacing' | 'containerWidth';
