export interface HistoricalEvent {
  id: string;
  title: string;
  date: string;
  year: number;
  month: number;
  day: number;
  description: string;
  imageUrl?: string;
  relatedEventIds: string[];
  category: string;
}

export interface CacheEntry {
  data: HistoricalEvent[];
  timestamp: number;
  ttl: number;
}

export interface CacheHandler {
  get(key: string): HistoricalEvent[] | null;
  set(key: string, data: HistoricalEvent[], ttl?: number): void;
  has(key: string): boolean;
  clear(): void;
  cleanup(): void;
}
