import axios from 'axios';
import type {
  Work,
  WorkListItem,
  Order,
  PurchaseRequest,
  PurchaseResponse
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const workApi = {
  getWorks: (params?: {
    page?: number;
    pageSize?: number;
    commercialOnly?: boolean;
    search?: string;
  }): Promise<{ works: WorkListItem[]; total: number; page: number; pageSize: number }> => {
    return api.get('/works', { params });
  },

  getWorkDetail: (id: string): Promise<Work> => {
    return api.get(`/works/${id}`);
  },

  uploadWork: (formData: FormData): Promise<Work> => {
    return api.post('/works/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const orderApi = {
  purchase: (data: PurchaseRequest): Promise<PurchaseResponse> => {
    return api.post('/purchase', data);
  },

  getOrders: (userId: string): Promise<Order[]> => {
    return api.get('/orders', { params: { userId } });
  }
};

export default api;
