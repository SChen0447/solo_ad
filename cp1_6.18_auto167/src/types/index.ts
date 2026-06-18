export type MoodLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Entry {
  id: string;
  date: string;
  time: string;
  text: string;
  images: string[];
  createdAt: number;
}

export interface DateNode {
  date: string;
  mood: MoodLevel | null;
  entryCount: number;
  entries: Entry[];
}

export interface MoodTrendPoint {
  date: string;
  mood: number | null;
}

export interface EventFrequencyPoint {
  date: string;
  count: number;
}

export interface StatsResult {
  moodAverage: number | null;
  moodTrend: MoodTrendPoint[];
  eventFrequency: EventFrequencyPoint[];
  totalEntries: number;
  streak: number;
}

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export type LayoutMode = 'horizontal' | 'vertical';
