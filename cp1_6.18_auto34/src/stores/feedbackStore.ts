import { create } from 'zustand';
import type {
  Feedback,
  NewFeedback,
  EmotionStats,
  ThemeDistributionItem,
  TrendDataPoint,
  Emotion,
  Theme,
} from '../types';

interface FeedbackStore {
  feedbackList: Feedback[];
  emotionStats: EmotionStats;
  themeDistribution: ThemeDistributionItem[];
  trendData: TrendDataPoint[];
  loading: boolean;
  fetchFeedback: () => Promise<void>;
  addFeedback: (data: NewFeedback) => Promise<void>;
  calculateStats: () => void;
}

const initialEmotionStats: EmotionStats = {
  positive: 0,
  negative: 0,
  neutral: 0,
  total: 0,
  positiveRate: 0,
  negativeRate: 0,
};

function calculateEmotionStats(feedbackList: Feedback[]): EmotionStats {
  const stats: EmotionStats = {
    positive: 0,
    negative: 0,
    neutral: 0,
    total: feedbackList.length,
    positiveRate: 0,
    negativeRate: 0,
  };

  for (const feedback of feedbackList) {
    stats[feedback.emotion]++;
  }

  if (stats.total > 0) {
    stats.positiveRate = Math.round((stats.positive / stats.total) * 100);
    stats.negativeRate = Math.round((stats.negative / stats.total) * 100);
  }

  return stats;
}

function calculateThemeDistribution(feedbackList: Feedback[]): ThemeDistributionItem[] {
  const themeMap = new Map<Theme, { count: number; emotion: Emotion }>();
  const themes: Theme[] = ['performance', 'feature', 'experience', 'price'];
  const total = feedbackList.length;

  for (const theme of themes) {
    themeMap.set(theme, { count: 0, emotion: 'neutral' });
  }

  for (const feedback of feedbackList) {
    const current = themeMap.get(feedback.theme)!;
    current.count++;
    if (feedback.emotion !== 'neutral') {
      current.emotion = feedback.emotion;
    }
  }

  const result: ThemeDistributionItem[] = [];
  for (const theme of themes) {
    const data = themeMap.get(theme)!;
    result.push({
      theme,
      count: data.count,
      percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
      emotion: data.emotion,
    });
  }

  return result;
}

function calculateTrendData(feedbackList: Feedback[]): TrendDataPoint[] {
  const dateMap = new Map<string, TrendDataPoint>();
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dateMap.set(dateStr, {
      date: dateStr,
      total: 0,
      positive: 0,
      negative: 0,
    });
  }

  for (const feedback of feedbackList) {
    const dateStr = feedback.timestamp.split('T')[0];
    const existing = dateMap.get(dateStr);
    if (existing) {
      existing.total++;
      if (feedback.emotion === 'positive') existing.positive++;
      if (feedback.emotion === 'negative') existing.negative++;
    }
  }

  return Array.from(dateMap.values());
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  feedbackList: [],
  emotionStats: initialEmotionStats,
  themeDistribution: [],
  trendData: [],
  loading: false,

  calculateStats: () => {
    const { feedbackList } = get();
    set({
      emotionStats: calculateEmotionStats(feedbackList),
      themeDistribution: calculateThemeDistribution(feedbackList),
      trendData: calculateTrendData(feedbackList),
    });
  },

  fetchFeedback: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/feedback');
      const data: Feedback[] = await response.json();
      set({
        feedbackList: data,
        emotionStats: calculateEmotionStats(data),
        themeDistribution: calculateThemeDistribution(data),
        trendData: calculateTrendData(data),
      });
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      set({ loading: false });
    }
  },

  addFeedback: async (data: NewFeedback) => {
    set({ loading: true });
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const updatedData: Feedback[] = await response.json();
      set({
        feedbackList: updatedData,
        emotionStats: calculateEmotionStats(updatedData),
        themeDistribution: calculateThemeDistribution(updatedData),
        trendData: calculateTrendData(updatedData),
      });
    } catch (error) {
      console.error('Failed to add feedback:', error);
    } finally {
      set({ loading: false });
    }
  },
}));
