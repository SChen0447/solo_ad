export type Emotion = 'positive' | 'negative' | 'neutral';

export type Theme = 'performance' | 'feature' | 'experience' | 'price';

export interface Feedback {
  id: string;
  customerName: string;
  channel: string;
  timestamp: string;
  description: string;
  emotion: Emotion;
  theme: Theme;
}

export interface NewFeedback {
  customerName: string;
  channel: string;
  timestamp: string;
  description: string;
}

export interface EmotionStats {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positiveRate: number;
  negativeRate: number;
}

export interface ThemeDistributionItem {
  theme: Theme;
  count: number;
  percentage: number;
  emotion: Emotion;
}

export interface TrendDataPoint {
  date: string;
  total: number;
  positive: number;
  negative: number;
}

export interface ExportReport {
  exportedAt: string;
  emotionStats: EmotionStats;
  themeDistribution: ThemeDistributionItem[];
  trendData: TrendDataPoint[];
  totalFeedbacks: number;
}

export const themeColors: Record<Theme, string> = {
  performance: '#00d4aa',
  feature: '#0099ff',
  experience: '#ff6b35',
  price: '#a855f7',
};

export const themeNames: Record<Theme, string> = {
  performance: '性能',
  feature: '功能',
  experience: '体验',
  price: '价格',
};

export const emotionEmojis: Record<Emotion, string> = {
  positive: '😊',
  negative: '😞',
  neutral: '😐',
};

export const emotionLabels: Record<Emotion, string> = {
  positive: '正面',
  negative: '负面',
  neutral: '中性',
};

export const emotionColors: Record<Emotion, string> = {
  positive: '#00d4aa',
  negative: '#ff6b35',
  neutral: '#6b7280',
};
