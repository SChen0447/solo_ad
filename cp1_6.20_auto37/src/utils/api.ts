import axios from 'axios';

export interface Feedback {
  id: string;
  content: string;
  emotion: 'positive' | 'neutral' | 'negative';
  name: string | null;
  is_anonymous: boolean;
  likes: number;
  created_at: string;
}

export interface TrendData {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface CreateFeedbackData {
  content: string;
  emotion: 'positive' | 'neutral' | 'negative';
  name?: string;
  is_anonymous: boolean;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error.response?.data || error.message);
  }
);

export const feedbackApi = {
  getFeedbacks: (emotion: string = 'all', sort: string = 'latest') => {
    return api.get<any, { success: boolean; data: Feedback[]; total: number }>('/feedbacks', {
      params: { emotion, sort },
    });
  },

  getFeedback: (id: string) => {
    return api.get<any, { success: boolean; data: Feedback }>(`/feedbacks/${id}`);
  },

  createFeedback: (data: CreateFeedbackData) => {
    return api.post<any, { success: boolean; data: Feedback }>('/feedbacks', data);
  },

  updateFeedback: (id: string, data: Partial<Feedback>) => {
    return api.put<any, { success: boolean; data: Feedback }>(`/feedbacks/${id}`, data);
  },

  deleteFeedback: (id: string) => {
    return api.delete<any, { success: boolean; message: string }>(`/feedbacks/${id}`);
  },

  likeFeedback: (id: string) => {
    return api.put<any, { success: boolean; data: { likes: number; liked: boolean } }>(
      `/feedbacks/${id}/like`
    );
  },
};

export const trendApi = {
  getTrends: (days: number = 7) => {
    return api.get<any, { success: boolean; data: TrendData[] }>('/trends', {
      params: { days },
    });
  },
};

export default api;
