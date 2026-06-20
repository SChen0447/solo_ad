import axios from 'axios';
import { NewsItem } from './types';
import { generateMockNewsBatch, generateMockNewsDetail } from './mockData';

const USE_MOCK_FALLBACK = true;

export async function fetchNewsList(
  page: number,
  perPage: number = 10,
  category?: string
): Promise<{ data: NewsItem[]; hasMore: boolean }> {
  try {
    const cat = category === '全部' ? undefined : category;
    const response = await axios.get('/api/news', {
      params: { page, per_page: perPage, category: cat }
    });
    return {
      data: response.data.data,
      hasMore: response.data.hasMore
    };
  } catch (error) {
    console.warn('API request failed, using mock data:', error);
    if (USE_MOCK_FALLBACK) {
      const cat = category === '全部' ? undefined : category;
      const mockData = generateMockNewsBatch(page, perPage, cat);
      return {
        data: mockData,
        hasMore: page < 10
      };
    }
    throw error;
  }
}

export async function fetchNewsDetail(id: number): Promise<NewsItem> {
  try {
    const response = await axios.get(`/api/news/${id}`);
    return response.data.data;
  } catch (error) {
    console.warn('API request failed, using mock data:', error);
    if (USE_MOCK_FALLBACK) {
      return generateMockNewsDetail(id);
    }
    throw error;
  }
}
