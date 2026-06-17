import axios from 'axios';
import type { Material, Schedule, PlatformValidation, PlatformType } from './types';

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
    const message = error.response?.data?.error || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

export const materialApi = {
  list: (params?: { search?: string; tag?: string }): Promise<Material[]> =>
    api.get('/materials', { params }),

  get: (id: string): Promise<Material> =>
    api.get(`/materials/${id}`),

  create: (data: Partial<Material>): Promise<Material> =>
    api.post('/materials', data),

  update: (id: string, data: Partial<Material>): Promise<Material> =>
    api.put(`/materials/${id}`, data),

  remove: (id: string): Promise<void> =>
    api.delete(`/materials/${id}`),
};

export const scheduleApi = {
  list: (params?: { start?: string; end?: string }): Promise<Schedule[]> =>
    api.get('/schedules', { params }),

  get: (id: string): Promise<Schedule> =>
    api.get(`/schedules/${id}`),

  create: (data: Partial<Schedule>): Promise<Schedule> =>
    api.post('/schedules', data),

  update: (id: string, data: Partial<Schedule>): Promise<Schedule> =>
    api.put(`/schedules/${id}`, data),

  remove: (id: string): Promise<void> =>
    api.delete(`/schedules/${id}`),

  reorder: (date: string, orderMap: Record<string, number>): Promise<void> =>
    api.post('/schedules/reorder', { date, orderMap }),
};

export const platformApi = {
  validate: (platform: PlatformType, title: string, content: string): Promise<PlatformValidation> =>
    api.post('/platforms/validate', { platform, title, content }),

  validateAll: async (title: string, content: string): Promise<PlatformValidation[]> => {
    const platforms: PlatformType[] = ['weibo', 'xiaohongshu', 'wechat'];
    const results = await Promise.all(
      platforms.map((p) => platformApi.validate(p, title, content))
    );
    return results;
  },
};

export const tagApi = {
  list: (): Promise<string[]> =>
    api.get('/tags'),

  create: (tag: string): Promise<string[]> =>
    api.post('/tags', { tag }),
};

export const uploadApi = {
  image: (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
