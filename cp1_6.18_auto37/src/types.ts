export interface Note {
  id: string;
  content: string;
  mood: string;
  createdAt: string;
}

export interface ColorBarData {
  mood: string;
  days: number;
  count: number;
  startDate: string;
  endDate: string;
  percentage: number;
}

export interface WeeklyStats {
  mostCommonMood: string;
  moodPercentages: Record<string, number>;
  totalNotes: number;
  totalDays: number;
}

export interface MoodColor {
  hex: string;
  name: string;
  icon: string;
}

export const MOOD_COLORS: Record<string, MoodColor> = {
  'soft-pink': { hex: '#FFB6C1', name: '温柔粉', icon: '🌸' },
  'peach': { hex: '#FFDAB9', name: '蜜桃橙', icon: '🍑' },
  'sunny-yellow': { hex: '#FFFACD', name: '晴日黄', icon: '☀️' },
  'mint-green': { hex: '#98FB98', name: '薄荷绿', icon: '🌿' },
  'sage': { hex: '#B5EAD7', name: '鼠尾草', icon: '🍃' },
  'sky-blue': { hex: '#87CEEB', name: '天空蓝', icon: '☁️' },
  'lavender': { hex: '#E6E6FA', name: '薰衣草', icon: '💜' },
  'lilac': { hex: '#C8A2C8', name: '丁香紫', icon: '🔮' },
  'coral': { hex: '#FF7F7F', name: '珊瑚红', icon: '🪸' },
  'sand': { hex: '#F5DEB3', name: '沙地棕', icon: '🏜️' },
  'aqua': { hex: '#AFEEEE', name: '水绿色', icon: '💎' },
  'rose': { hex: '#FFC0CB', name: '玫瑰色', icon: '🌹' }
};

export const MOOD_ORDER = [
  'soft-pink', 'peach', 'sunny-yellow', 'mint-green',
  'sage', 'sky-blue', 'lavender', 'lilac',
  'coral', 'sand', 'aqua', 'rose'
];
