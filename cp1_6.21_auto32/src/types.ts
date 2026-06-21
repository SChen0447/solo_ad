export type EmotionTag = {
  type: string;
  intensity: number;
};

export type Diary = {
  id: string;
  content: string;
  emotions: EmotionTag[];
  createdAt: number;
  date: string;
};

export type EmotionMeta = {
  type: string;
  emoji: string;
  color: string;
  bg: string;
  gradient: string;
};

export const EMOTIONS: EmotionMeta[] = [
  {
    type: '快乐',
    emoji: '😊',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    gradient: 'linear-gradient(135deg, #fde68a 0%, #fcd34d 100%)',
  },
  {
    type: '悲伤',
    emoji: '😢',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.15)',
    gradient: 'linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%)',
  },
  {
    type: '愤怒',
    emoji: '😠',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    gradient: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)',
  },
  {
    type: '平静',
    emoji: '😌',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    gradient: 'linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)',
  },
  {
    type: '焦虑',
    emoji: '😰',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
    gradient: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
  },
  {
    type: '惊喜',
    emoji: '😮',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    gradient: 'linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 100%)',
  },
];

export function getEmotionMeta(type: string): EmotionMeta | undefined {
  return EMOTIONS.find((e) => e.type === type);
}

export type StatsItem = {
  date: string;
  快乐: number;
  悲伤: number;
  愤怒: number;
  平静: number;
  焦虑: number;
  惊喜: number;
  primary: string;
};
