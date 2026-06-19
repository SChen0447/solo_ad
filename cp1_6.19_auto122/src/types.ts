export type IllustrationStyle =
  | 'ukiyo-e'
  | 'american-retro'
  | 'cyberpunk'
  | 'ink-wash'
  | 'pixel-art';

export interface Illustration {
  id: string;
  title: string;
  style: IllustrationStyle;
  imageUrl: string;
}

export interface GameState {
  score: number;
  combo: number;
  streak: number;
  bestScore: number;
  currentCardIndex: number;
  timeLeft: number;
  totalTime: number;
  isPlaying: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface DailyRecord {
  date: string;
  score: number;
  averageScore: number;
  bestScore: number;
  cardsCompleted: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export const STYLE_INFO: Record<IllustrationStyle, { name: string; color: string; bgColor: string }> = {
  'ukiyo-e': {
    name: '浮世绘',
    color: '#d43333',
    bgColor: 'rgba(212, 51, 51, 0.3)'
  },
  'american-retro': {
    name: '美式复古',
    color: '#2a6099',
    bgColor: 'rgba(42, 96, 153, 0.3)'
  },
  'cyberpunk': {
    name: '赛博朋克',
    color: '#9b59b6',
    bgColor: 'rgba(155, 89, 182, 0.3)'
  },
  'ink-wash': {
    name: '水墨风',
    color: '#5d6d7e',
    bgColor: 'rgba(93, 109, 126, 0.3)'
  },
  'pixel-art': {
    name: '像素风',
    color: '#2ecc71',
    bgColor: 'rgba(46, 204, 113, 0.3)'
  }
};
