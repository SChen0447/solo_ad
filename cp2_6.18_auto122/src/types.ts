export interface FontSettings {
  chineseFont: string;
  englishFont: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
}

export interface FavoriteItem {
  id: string;
  left: FontSettings;
  right: FontSettings;
  name: string;
  createdAt: number;
}

export const CHINESE_FONTS: { value: string; label: string; isGoogle?: boolean }[] = [
  { value: 'SimSun', label: '宋体' },
  { value: 'SimHei', label: '黑体' },
  { value: 'KaiTi', label: '楷体' },
  { value: '"Microsoft YaHei"', label: '微软雅黑' },
  { value: '"Noto Serif SC"', label: '思源宋体', isGoogle: true },
];

export const ENGLISH_FONTS: { value: string; label: string; isGoogle?: boolean }[] = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: '"Times New Roman"', label: 'Times New Roman' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: '"Open Sans"', label: 'Open Sans', isGoogle: true },
];

export const DEFAULT_LEFT: FontSettings = {
  chineseFont: '"Noto Serif SC"',
  englishFont: '"Open Sans"',
  fontSize: 16,
  lineHeight: 1.6,
  fontWeight: 400,
};

export const DEFAULT_RIGHT: FontSettings = {
  chineseFont: 'SimSun',
  englishFont: 'Georgia',
  fontSize: 16,
  lineHeight: 1.6,
  fontWeight: 400,
};

export const DEFAULT_TEXT = `这是一段用于测试字体排版效果的示例文本。The quick brown fox jumps over the lazy dog.

在排版设计中，字体的选择至关重要。不同的字体传达不同的情感和风格。宋体给人传统、正式的感觉，而黑体则显得现代、简洁。A well-chosen font combination can significantly enhance readability and visual appeal.

用户可以通过调整字号、行高和字重，找到最适合阅读体验的参数组合。首行缩进两个字符是中文排版的传统规范。Typography is both an art and a science, balancing aesthetics with functionality.

请尝试输入您自己的文本，或者直接使用这段示例文字来对比不同字体的效果。`;
