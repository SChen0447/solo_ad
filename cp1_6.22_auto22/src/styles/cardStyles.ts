export type CardStyle = 'newspaper' | 'typewriter' | 'handwritten' | 'poster';

export type EmphasisType = 'bold' | 'underline' | 'red';

export interface Decoration {
  type: 'line' | 'stamp' | 'border' | 'corner' | 'inkblot';
  position: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  color?: string;
}

export interface CardStyleConfig {
  name: string;
  backgroundColor: string;
  backgroundGradient?: string;
  titleFont: string;
  contentFont: string;
  titleColor: string;
  contentColor: string;
  accentColor: string;
  borderStyle: string;
  borderWidth: number;
  borderColor: string;
  paperTexture: string;
  decorations: Decoration[];
  titleSize: string;
  contentSize: string;
  padding: string;
}

export const cardStyles: Record<CardStyle, CardStyleConfig> = {
  newspaper: {
    name: '旧报纸',
    backgroundColor: '#f5e6c8',
    backgroundGradient: 'linear-gradient(135deg, #f5e6c8 0%, #e8d4a8 50%, #f0dbb8 100%)',
    titleFont: '"Noto Serif SC", "SimHei", serif',
    contentFont: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
    titleColor: '#2c2c2c',
    contentColor: '#3d3d3d',
    accentColor: '#c41e3a',
    borderStyle: 'solid',
    borderWidth: 2,
    borderColor: '#8b7355',
    paperTexture: `
      radial-gradient(ellipse at 20% 30%, rgba(139, 115, 85, 0.1) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 70%, rgba(139, 115, 85, 0.08) 0%, transparent 40%),
      repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)
    `,
    decorations: [
      { type: 'line', position: 'top', color: '#c41e3a' },
      { type: 'line', position: 'bottom', color: '#8b7355' }
    ],
    titleSize: '28px',
    contentSize: '15px',
    padding: '30px 25px'
  },
  typewriter: {
    name: '打字机',
    backgroundColor: '#faf8f0',
    backgroundGradient: 'linear-gradient(180deg, #faf8f0 0%, #f2efe0 100%)',
    titleFont: '"Special Elite", "Courier New", monospace',
    contentFont: '"Special Elite", "Courier New", monospace',
    titleColor: '#1a1a1a',
    contentColor: '#2a2a2a',
    accentColor: '#4a4a4a',
    borderStyle: 'none',
    borderWidth: 0,
    borderColor: 'transparent',
    paperTexture: `
      radial-gradient(circle at 15% 25%, rgba(50, 50, 50, 0.08) 1px, transparent 1px),
      radial-gradient(circle at 45% 55%, rgba(50, 50, 50, 0.06) 2px, transparent 2px),
      radial-gradient(circle at 75% 35%, rgba(50, 50, 50, 0.07) 1px, transparent 1px),
      radial-gradient(circle at 25% 75%, rgba(50, 50, 50, 0.05) 3px, transparent 3px),
      radial-gradient(circle at 85% 85%, rgba(50, 50, 50, 0.04) 2px, transparent 2px)
    `,
    decorations: [
      { type: 'inkblot', position: 'topleft' },
      { type: 'inkblot', position: 'bottomright' }
    ],
    titleSize: '24px',
    contentSize: '14px',
    padding: '35px 30px'
  },
  handwritten: {
    name: '手写体',
    backgroundColor: '#fff9e6',
    backgroundGradient: 'linear-gradient(180deg, #fff9e6 0%, #fff3cc 100%)',
    titleFont: '"Caveat", "ZCOOL XiaoWei", cursive',
    contentFont: '"Caveat", "ZCOOL XiaoWei", cursive',
    titleColor: '#1a365d',
    contentColor: '#2d3748',
    accentColor: '#c53030',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#d4a574',
    paperTexture: `
      repeating-linear-gradient(transparent, transparent 27px, rgba(100, 149, 237, 0.2) 27px, rgba(100, 149, 237, 0.2) 28px),
      linear-gradient(90deg, transparent 40px, rgba(255, 182, 193, 0.3) 40px, rgba(255, 182, 193, 0.3) 42px, transparent 42px)
    `,
    decorations: [
      { type: 'corner', position: 'topleft', color: '#d4a574' },
      { type: 'corner', position: 'topright', color: '#d4a574' },
      { type: 'corner', position: 'bottomleft', color: '#d4a574' },
      { type: 'corner', position: 'bottomright', color: '#d4a574' }
    ],
    titleSize: '36px',
    contentSize: '22px',
    padding: '40px 45px'
  },
  poster: {
    name: '江湖告示',
    backgroundColor: '#ffd93d',
    backgroundGradient: 'linear-gradient(135deg, #ffd93d 0%, #ffb347 50%, #ffd93d 100%)',
    titleFont: '"ZCOOL KuaiLe", "Noto Sans SC", sans-serif',
    contentFont: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
    titleColor: '#1a1a1a',
    contentColor: '#1a1a1a',
    accentColor: '#c41e3a',
    borderStyle: 'double',
    borderWidth: 6,
    borderColor: '#1a1a1a',
    paperTexture: `
      radial-gradient(ellipse at center, rgba(255, 255, 255, 0.1) 0%, transparent 60%)
    `,
    decorations: [
      { type: 'border', position: 'center', color: '#1a1a1a' },
      { type: 'stamp', position: 'bottomright', color: '#c41e3a' }
    ],
    titleSize: '32px',
    contentSize: '16px',
    padding: '25px 20px'
  }
};

export const styleThumbnails: Record<CardStyle, string> = {
  newspaper: '📰',
  typewriter: '⌨️',
  handwritten: '✍️',
  poster: '📜'
};
