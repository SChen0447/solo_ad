import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AxiosResponse } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        localStorage.removeItem('token');
      }
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const beansAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/beans', { params }) as Promise<{ beans: any[]; total: number }>,
  getOne: (id: number) =>
    api.get(`/beans/${id}`) as Promise<any>,
  getRecommendations: () =>
    api.get('/beans/recommendations') as Promise<{ beans: any[]; reason: string }>,
};

export const notesAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get('/notes', { params }) as Promise<{ notes: any[]; total: number }>,
  create: (data: any) =>
    api.post('/notes', data) as Promise<any>,
  delete: (id: number) =>
    api.delete(`/notes/${id}`) as Promise<void>,
  like: (id: number) =>
    api.post(`/notes/${id}/like`) as Promise<{ liked: boolean; likes_count: number }>,
  addComment: (id: number, data: { content: string; parent_id?: number }) =>
    api.post(`/notes/${id}/comments`, data) as Promise<any>,
};

export const subscriptionsAPI = {
  getAll: () =>
    api.get('/subscriptions') as Promise<{ subscriptions: any[] }>,
  create: (data: any) =>
    api.post('/subscriptions', data) as Promise<any>,
  update: (id: number, data: any) =>
    api.put(`/subscriptions/${id}`, data) as Promise<any>,
  cancel: (id: number) =>
    api.delete(`/subscriptions/${id}`) as Promise<void>,
  getDeliveries: (id: number) =>
    api.get(`/subscriptions/${id}/deliveries`) as Promise<{ deliveries: any[] }>,
};

export const userAPI = {
  getProfile: () =>
    api.get('/user/profile') as Promise<any>,
  getStats: () =>
    api.get('/user/stats') as Promise<any>,
  updateProfile: (data: any) =>
    api.put('/user/profile', data) as Promise<any>,
};

export default api;
