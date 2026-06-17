export type MoodType =
  | 'happy'
  | 'calm'
  | 'excited'
  | 'grateful'
  | 'anxious'
  | 'sad'
  | 'angry'
  | 'tired';

export interface MoodConfig {
  key: MoodType;
  name: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  solidColor: string;
  rgbaColor: string;
}

export interface MoodRecord {
  id: string;
  mood: MoodType;
  energy: number;
  timestamp: number;
  dateKey: string;
}

export type ViewType = 'diary' | 'trend';

export const MOOD_CONFIGS: MoodConfig[] = [
  {
    key: 'happy',
    name: '快乐',
    emoji: '😊',
    gradientFrom: '#FFD700',
    gradientTo: '#FF8C00',
    solidColor: '#FFB347',
    rgbaColor: 'rgba(255, 179, 71, 0.6)',
  },
  {
    key: 'excited',
    name: '兴奋',
    emoji: '🤩',
    gradientFrom: '#FF69B4',
    gradientTo: '#FF1493',
    solidColor: '#FF4FA3',
    rgbaColor: 'rgba(255, 79, 163, 0.6)',
  },
  {
    key: 'grateful',
    name: '感恩',
    emoji: '🙏',
    gradientFrom: '#F4A460',
    gradientTo: '#DEB887',
    solidColor: '#E8B779',
    rgbaColor: 'rgba(232, 183, 121, 0.6)',
  },
  {
    key: 'calm',
    name: '平静',
    emoji: '😌',
    gradientFrom: '#98FB98',
    gradientTo: '#AFEEEE',
    solidColor: '#A3F2D0',
    rgbaColor: 'rgba(163, 242, 208, 0.6)',
  },
  {
    key: 'tired',
    name: '疲倦',
    emoji: '😴',
    gradientFrom: '#6B7280',
    gradientTo: '#D1D5DB',
    solidColor: '#9EA4AE',
    rgbaColor: 'rgba(158, 164, 174, 0.6)',
  },
  {
    key: 'sad',
    name: '悲伤',
    emoji: '😢',
    gradientFrom: '#1E3A8A',
    gradientTo: '#87CEEB',
    solidColor: '#5B96D0',
    rgbaColor: 'rgba(91, 150, 208, 0.6)',
  },
  {
    key: 'anxious',
    name: '焦虑',
    emoji: '😰',
    gradientFrom: '#9370DB',
    gradientTo: '#DDA0DD',
    solidColor: '#B898DE',
    rgbaColor: 'rgba(184, 152, 222, 0.6)',
  },
  {
    key: 'angry',
    name: '愤怒',
    emoji: '😠',
    gradientFrom: '#DC2626',
    gradientTo: '#F97316',
    solidColor: '#EF4D1E',
    rgbaColor: 'rgba(239, 77, 30, 0.6)',
  },
];

export const ENERGY_EMOJIS: Record<number, string> = {
  1: '😫',
  2: '😩',
  3: '😔',
  4: '😕',
  5: '😐',
  6: '🙂',
  7: '😊',
  8: '😄',
  9: '🤗',
  10: '🥳',
};

export function getMoodConfig(key: MoodType): MoodConfig {
  return MOOD_CONFIGS.find((m) => m.key === key) || MOOD_CONFIGS[0];
}

export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
  );
}

export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
