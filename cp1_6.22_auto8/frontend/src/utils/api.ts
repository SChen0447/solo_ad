import axios from 'axios';
import type { RoastBatch } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const batchApi = {
  async list(offset = 0, limit = 20, filters?: { beanId?: string }): Promise<{ success: boolean; data: RoastBatch[] }> {
    const params: Record<string, any> = { offset, limit };
    if (filters?.beanId) params.beanId = filters.beanId;
    const res = await api.get('/batches', { params });
    return res.data;
  },

  async getById(id: number): Promise<{ success: boolean; data: RoastBatch }> {
    const res = await api.get(`/batches/${id}`);
    return res.data;
  },

  async create(data: Omit<RoastBatch, 'id' | 'userId' | 'createdAt'>): Promise<{ success: boolean; data: RoastBatch }> {
    const res = await api.post('/batches', data);
    return res.data;
  },

  async compare(ids: number[]): Promise<{ success: boolean; data: RoastBatch[] }> {
    const res = await api.post('/compare', { ids });
    return res.data;
  },
};

export default api;
