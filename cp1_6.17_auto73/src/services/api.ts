import axios from 'axios';
import type {
  Idea,
  IdeaResponse,
  Weights,
  CreateIdeaData,
  VoteData,
  LikeData,
  CommentData,
  MatrixPosition
} from '../types';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const ideaApi = {
  getAllIdeas: async (): Promise<IdeaResponse> => {
    const response = await apiClient.get('/ideas');
    return response.data;
  },

  createIdea: async (data: CreateIdeaData): Promise<Idea> => {
    const response = await apiClient.post('/ideas', data);
    return response.data;
  },

  likeIdea: async (ideaId: string, data: LikeData): Promise<Idea> => {
    const response = await apiClient.post(`/ideas/${ideaId}/like`, data);
    return response.data;
  },

  voteIdea: async (ideaId: string, data: VoteData): Promise<Idea> => {
    const response = await apiClient.post(`/ideas/${ideaId}/vote`, data);
    return response.data;
  },

  commentIdea: async (ideaId: string, data: CommentData): Promise<Idea> => {
    const response = await apiClient.post(`/ideas/${ideaId}/comment`, data);
    return response.data;
  },

  updateMatrixPosition: async (data: MatrixPosition): Promise<Idea> => {
    const response = await apiClient.put('/matrix', data);
    return response.data;
  },

  getWeights: async (): Promise<Weights> => {
    const response = await apiClient.get('/weights');
    return response.data;
  },

  updateWeights: async (data: Weights): Promise<{ weights: Weights; ideas: Idea[] }> => {
    const response = await apiClient.put('/weights', data);
    return response.data;
  },

  healthCheck: async (): Promise<{ status: string; clients: number }> => {
    const response = await apiClient.get('/health');
    return response.data;
  }
};

export const getUserId = (): string => {
  let userId = localStorage.getItem('idea_matrix_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('idea_matrix_user_id', userId);
  }
  return userId;
};

export const getUserName = (): string => {
  return localStorage.getItem('idea_matrix_user_name') || '匿名用户';
};

export const setUserName = (name: string): void => {
  localStorage.setItem('idea_matrix_user_name', name);
};
