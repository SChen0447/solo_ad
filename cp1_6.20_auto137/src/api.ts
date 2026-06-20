import axios from 'axios';
import type { Diary, EmotionType, CollageTemplate, CollageResponse, EmotionStats } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchDiaries(month: string): Promise<Diary[]> {
  const res = await api.get('/diaries', { params: { month } });
  return res.data;
}

export async function fetchDiary(id: string): Promise<Diary> {
  const res = await api.get(`/diaries/${id}`);
  return res.data;
}

export async function createDiary(data: {
  emotion: EmotionType;
  text: string;
  emojis: { emoji: string; x: number; y: number; scale: number }[];
  template: CollageTemplate;
}): Promise<Diary> {
  const res = await api.post('/diaries', data);
  return res.data;
}

export async function deleteDiary(id: string): Promise<void> {
  await api.delete(`/diaries/${id}`);
}

export async function generateCollage(data: {
  emotion: EmotionType;
  text: string;
  emojis: string[];
  template: CollageTemplate;
}): Promise<CollageResponse> {
  const res = await api.post('/collage/generate', data);
  return res.data;
}

export async function fetchStats(month: string): Promise<EmotionStats[]> {
  const res = await api.get('/stats', { params: { month } });
  return res.data;
}
