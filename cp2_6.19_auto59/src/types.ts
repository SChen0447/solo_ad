export interface TypographyConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  color: string;
}

export interface Sample {
  id: string;
  config: TypographyConfig;
}

export const FONT_OPTIONS = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Playfair Display',
  'Source Code Pro',
];

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export const DEFAULT_SAMPLES: Sample[] = [
  {
    id: 'sample-1',
    config: {
      text: '设计是解决问题的艺术。好的排版能够让阅读成为一种享受，让信息传递更加高效。字体、字号、行高和字重的组合，构成了排版的基础语言。',
      fontFamily: 'Roboto',
      fontSize: 16,
      lineHeight: 1.5,
      fontWeight: 400,
      color: '#333333',
    },
  },
  {
    id: 'sample-2',
    config: {
      text: 'Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed.',
      fontFamily: 'Playfair Display',
      fontSize: 20,
      lineHeight: 1.6,
      fontWeight: 500,
      color: '#1a1a2e',
    },
  },
  {
    id: 'sample-3',
    config: {
      text: 'const greeting = "Hello, World!";\nfunction sayHello() {\n  console.log(greeting);\n}',
      fontFamily: 'Source Code Pro',
      fontSize: 14,
      lineHeight: 1.4,
      fontWeight: 400,
      color: '#24292e',
    },
  },
];
