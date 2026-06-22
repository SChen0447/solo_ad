export type Language = 'en' | 'ja' | 'es' | 'fr' | 'de';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: '英语',
  ja: '日语',
  es: '西班牙语',
  fr: '法语',
  de: '德语'
};

export interface Note {
  id: string;
  word: string;
  meaning: string;
  example1: string;
  example2: string;
  language: Language;
  createdAt: number;
  nextReviewAt: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt?: number;
}

export interface DailyStats {
  date: string;
  newCount: number;
  reviewedCount: number;
}
