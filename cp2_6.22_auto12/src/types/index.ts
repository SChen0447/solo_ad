export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  moodColor: string;
  keywords: string[];
  moodLevel: number;
}

export interface MoodAnalysisResult {
  color: string;
  keywords: string[];
  moodLevel: number;
}

export interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasDiary: boolean;
  moodColor?: string;
}

export type ViewMode = 'day' | 'week';
