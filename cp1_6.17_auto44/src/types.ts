export interface FeedSource {
  id: string;
  name: string;
  url: string;
  icon: string;
  lastUpdated: string;
  color: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string;
  link: string;
  sentimentScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
}

export interface Stats {
  totalArticles: number;
  sourceCount: number;
  avgSentiment: number;
}

export interface VolumeTrend {
  labels: string[];
  datasets: { sourceName: string; data: number[] }[];
}

export interface KeywordTrend {
  labels: string[];
  datasets: { keyword: string; data: number[] }[];
}

export interface SentimentDist {
  datasets: { sourceName: string; positive: number; neutral: number; negative: number }[];
}

export interface CompareData {
  volumeTrend: VolumeTrend;
  keywordTrend: KeywordTrend;
  sentimentDist: SentimentDist;
}
