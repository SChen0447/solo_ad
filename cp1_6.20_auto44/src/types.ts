export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  ai_tag: string;
  highlights: number[];
}

export interface NewsListResponse {
  code: number;
  data: NewsItem[];
  hasMore: boolean;
  page: number;
  perPage: number;
}

export interface NewsDetailResponse {
  code: number;
  data: NewsItem;
}
