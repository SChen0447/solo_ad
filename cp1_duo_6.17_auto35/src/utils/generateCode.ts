import type { TypographyParams } from './textSample';
import { FONT_OPTIONS } from './textSample';

export const generateCSS = (params: TypographyParams): string => {
  const fontOption = FONT_OPTIONS.find(f => f.name === params.fontFamily);
  const fontFamily = fontOption?.cssValue || 'sans-serif';

  const css = `.typography {
  font-family: ${fontFamily};
  font-size: ${params.fontSize}px;
  line-height: ${params.lineHeight};
  letter-spacing: ${params.letterSpacing}em;
  text-align: ${params.textAlign};
  max-width: ${params.containerWidth}px;
}`;

  return css;
};

export const generateTailwind = (params: TypographyParams): string => {
  const fontMap: Record<string, string> = {
    'noto-sans-sc': 'font-noto',
    'roboto': 'font-roboto',
    'playfair-display': 'font-playfair',
    'source-code-pro': 'font-mono',
    'system-ui': 'font-sans'
  };

  const alignMap: Record<string, string> = {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right',
    'justify': 'text-justify'
  };

  const classes = [
    fontMap[params.fontFamily] || 'font-sans',
    `text-[${params.fontSize}px]`,
    `leading-[${params.lineHeight}]`,
    `tracking-[${params.letterSpacing}em]`,
    alignMap[params.textAlign] || 'text-left',
    `max-w-[${params.containerWidth}px]`
  ];

  return `<p className="${classes.join(' ')}">
  Your text content here
</p>`;
};

export const generateCodeBlock = (params: TypographyParams, format: 'css' | 'tailwind' = 'css'): string => {
  if (format === 'tailwind') {
    return generateTailwind(params);
  }
  return generateCSS(params);
};
