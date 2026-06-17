export interface TypographyParams {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  containerWidth: number;
}

export function generateCSS(params: TypographyParams): string {
  const { fontFamily, fontSize, lineHeight, letterSpacing, textAlign, containerWidth } = params;

  const css = `.typography-preview {
  font-family: '${fontFamily}', sans-serif;
  font-size: ${fontSize}px;
  line-height: ${lineHeight};
  letter-spacing: ${letterSpacing}em;
  text-align: ${textAlign};
  width: ${containerWidth}px;
  max-width: 100%;
}`;

  return css;
}

export function generateTailwindClasses(params: TypographyParams): string {
  const { fontFamily, fontSize, lineHeight, letterSpacing, textAlign, containerWidth } = params;

  const fontMap: Record<string, string> = {
    'Roboto': 'font-sans',
    'Noto Sans SC': 'font-sans',
    'Playfair Display': 'font-serif',
    'Source Code Pro': 'font-mono'
  };

  const alignMap: Record<string, string> = {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right',
    'justify': 'text-justify'
  };

  const classes = [
    fontMap[fontFamily] || 'font-sans',
    `text-[${fontSize}px]`,
    `leading-[${lineHeight}]`,
    `tracking-[${letterSpacing}em]`,
    alignMap[textAlign] || 'text-left',
    `w-[${containerWidth}px]`
  ].join(' ');

  return `className="${classes}"`;
}

export function generateCode(params: TypographyParams): string {
  return generateCSS(params);
}

export default generateCode;
