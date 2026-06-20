import axiosInstance from './api';
import { Score, RankingItem, PendingWork, ScoreFormData } from '../types';

export const getPendingWorks = async (): Promise<{ works: PendingWork[] }> => {
  const response = await axiosInstance.get('/scores/pending');
  return response.data;
};

export const getWorkScores = async (workId: number): Promise<{ scores: Score[] }> => {
  const response = await axiosInstance.get(`/scores/work/${workId}`);
  return response.data;
};

export const submitScore = async (data: ScoreFormData): Promise<{ score: Score }> => {
  const response = await axiosInstance.post('/scores', data);
  return response.data;
};

export const getRankings = async (): Promise<{ rankings: RankingItem[] }> => {
  const response = await axiosInstance.get('/scores/rankings');
  return response.data;
};

export const exportRankings = async (): Promise<void> => {
  const response = await axiosInstance.get('/scores/export', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'rankings.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
