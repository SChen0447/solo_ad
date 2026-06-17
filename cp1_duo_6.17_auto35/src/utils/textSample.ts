export const TEXT_SAMPLE = `在数字时代，字体排印不仅是信息传递的载体，更是情感表达的艺术。Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. 

当我们谈论优秀的排版时，我们谈论的是文字与空间的和谐共舞。每一个字符的间距、每一行的高度、每一段落的留白，都在潜移默化地影响着读者的阅读体验。The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing (leading), and letter-spacing (tracking).

中文排版有其独特的韵律与美感。汉字作为方块字，在排版时需要考虑字重、字号、行高与版心宽度的微妙平衡。无论是宋体的典雅、黑体的现代，还是楷体的温润，每一种字体都承载着不同的文化气质与视觉情绪。

英文排版则注重字母间的流动与节奏。从 Baskerville 的经典衬线到 Helvetica 的极简无衬线，从 Playfair Display 的优雅展示到 Source Code Pro 的代码专用，字体的选择直接决定了设计作品的性格与格调。"Good design is obvious. Great design is transparent." — Joe Sparano

当多种语言混合排版时，挑战与机遇并存。如何让中文字体与西文字体在视觉上协调统一？如何让标点符号在不同语言间自然过渡？这正是字体排印实验台存在的意义——让每一位设计师都能在实践中找到属于自己的答案。

无论你是经验丰富的设计师，还是正在学习排版的初学者，理解字体背后的逻辑、掌握参数调校的技巧，都将帮助你创造出更具感染力的视觉作品。Remember: typography is the craft of endowing human language with a durable visual form.`;

export interface TypographyParams {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  containerWidth: number;
}

export interface FontOption {
  name: string;
  label: string;
  cssValue: string;
  category: 'chinese' | 'english' | 'monospace' | 'serif';
}

export const FONT_OPTIONS: FontOption[] = [
  {
    name: 'noto-sans-sc',
    label: 'Noto Sans SC',
    cssValue: '"Noto Sans SC", system-ui, sans-serif',
    category: 'chinese'
  },
  {
    name: 'roboto',
    label: 'Roboto',
    cssValue: '"Roboto", system-ui, sans-serif',
    category: 'english'
  },
  {
    name: 'playfair-display',
    label: 'Playfair Display',
    cssValue: '"Playfair Display", serif',
    category: 'serif'
  },
  {
    name: 'source-code-pro',
    label: 'Source Code Pro',
    cssValue: '"Source Code Pro", monospace',
    category: 'monospace'
  },
  {
    name: 'system-ui',
    label: 'System UI',
    cssValue: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    category: 'english'
  }
];

export const DEFAULT_PARAMS: TypographyParams = {
  fontFamily: 'noto-sans-sc',
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0,
  textAlign: 'left',
  containerWidth: 720
};

export const SLIDER_CONFIG = {
  fontSize: { min: 12, max: 80, step: 1 },
  lineHeight: { min: 1.0, max: 2.5, step: 0.1 },
  letterSpacing: { min: -0.1, max: 0.5, step: 0.01 },
  containerWidth: { min: 320, max: 1280, step: 1 }
} as const;

export const ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
  { value: 'justify', label: '两端对齐' }
] as const;
