import type { Preset, FontConfig } from '@/types';

const heading = (
  family: string,
  size = 36,
  lineHeight = 1.3,
  letterSpacing = 0,
  weight: FontConfig['weight'] = 700
): FontConfig => ({ family, size, lineHeight, letterSpacing, weight });

const body = (
  family: string,
  size = 16,
  lineHeight = 1.6,
  letterSpacing = 0,
  weight: FontConfig['weight'] = 400
): FontConfig => ({ family, size, lineHeight, letterSpacing, weight });

export const PRESETS: Preset[] = [
  {
    id: 'editorial-classic',
    name: '经典编辑排版',
    description: 'Playfair Display + Inter，优雅的杂志风格',
    heading: heading('Playfair Display', 40, 1.2, 0, 700),
    body: body('Inter', 16, 1.7, 0.2, 400),
  },
  {
    id: 'modern-minimal',
    name: '现代极简',
    description: 'Space Grotesk + Inter，科技感现代设计',
    heading: heading('Space Grotesk', 36, 1.25, -0.5, 600),
    body: body('Inter', 15, 1.6, 0, 400),
  },
  {
    id: 'serif-elegant',
    name: '衬线优雅',
    description: 'Fraunces + Lora，书香气息浓厚',
    heading: heading('Fraunces', 42, 1.2, 0, 500),
    body: body('Lora', 17, 1.75, 0, 400),
  },
  {
    id: 'business-tech',
    name: '科技商务',
    description: 'Poppins + Open Sans，专业商务文档',
    heading: heading('Poppins', 34, 1.3, -0.3, 600),
    body: body('Open Sans', 16, 1.65, 0, 400),
  },
  {
    id: 'geometric-clean',
    name: '几何简洁',
    description: 'Montserrat + Noto Sans，清晰现代',
    heading: heading('Montserrat', 38, 1.2, -0.2, 700),
    body: body('Noto Sans', 15, 1.6, 0, 400),
  },
  {
    id: 'newspaper-tradition',
    name: '传统报纸',
    description: 'Libre Baskerville + Georgia，经典报纸排版',
    heading: heading('Libre Baskerville', 42, 1.2, 0, 700),
    body: body('Georgia', 17, 1.7, 0, 400),
  },
  {
    id: 'art-deco',
    name: '装饰艺术',
    description: 'DM Serif Display + Merriweather，复古装饰风',
    heading: heading('DM Serif Display', 44, 1.15, 0, 400),
    body: body('Merriweather', 16, 1.7, 0.2, 400),
  },
  {
    id: 'neo-grotesk',
    name: '新哥特风',
    description: 'Roboto + Source Sans 3，简洁瑞士设计',
    heading: heading('Roboto', 36, 1.2, -0.5, 700),
    body: body('Source Sans 3', 16, 1.6, 0, 400),
  },
  {
    id: 'scholarly-work',
    name: '学术排版',
    description: 'Noto Serif + Crimson Pro，学术期刊风格',
    heading: heading('Noto Serif', 40, 1.25, 0, 700),
    body: body('Crimson Pro', 18, 1.8, 0, 400),
  },
  {
    id: 'code-doc',
    name: '技术文档',
    description: 'JetBrains Mono + Lato，适合开发者文档',
    heading: heading('Lato', 34, 1.3, 0, 700),
    body: body('JetBrains Mono', 14, 1.65, 0, 400),
  },
];

export default PRESETS;
