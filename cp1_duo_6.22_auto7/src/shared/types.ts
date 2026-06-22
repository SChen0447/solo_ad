export interface Comment {
  id: string;
  content: string;
  rating: number;
  date: string;
}

export type KeywordCategory = 'positive' | 'negative' | 'neutral';

export interface KeywordResult {
  word: string;
  frequency: number;
  category: KeywordCategory;
  weeklyData: WeeklyDataPoint[];
}

export interface WeeklyDataPoint {
  week: string;
  count: number;
}

export interface AnalysisResult {
  keywords: KeywordResult[];
}

export type SortField = 'rating' | 'date';
export type SortOrder = 'asc' | 'desc';
