export type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'anxious';

export interface MoodRecord {
  id: string;
  mood: MoodType;
  description: string;
  timestamp: number;
  date: string;
}

export interface MoodConfig {
  label: string;
  value: number;
  emoji: string;
  color: string;
}

export const MOOD_CONFIGS: Record<MoodType, MoodConfig> = {
  happy: { label: '开心', value: 5, emoji: '😊', color: '#66bb6a' },
  calm: { label: '平静', value: 4, emoji: '😌', color: '#42a5f5' },
  anxious: { label: '焦虑', value: 3, emoji: '😰', color: '#ffa726' },
  sad: { label: '悲伤', value: 2, emoji: '😢', color: '#78909c' },
  angry: { label: '愤怒', value: 1, emoji: '😠', color: '#ef5350' }
};

export type ViewMode = 'week' | 'month';

export interface AppState {
  records: MoodRecord[];
  viewMode: ViewMode;
}

export type Action =
  | { type: 'ADD_RECORD'; payload: MoodRecord }
  | { type: 'SET_RECORDS'; payload: MoodRecord[] }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode };
