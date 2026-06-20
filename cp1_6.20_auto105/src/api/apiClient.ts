import axios, { AxiosError, AxiosResponse } from 'axios';
import type { Event, Material, MaterialClaim } from '../types';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('请求错误:', error.message);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError) => {
    const message = error.response?.data?.message || error.message || '请求失败';
    console.error('响应错误:', message);
    showToast(message, 'error');
    return Promise.reject(error);
  }
);

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  
  const existing = document.getElementById('app-toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    z-index: 9999;
    transition: opacity 0.3s ease;
    opacity: 0;
    ${type === 'error' ? 'background-color: #ff4757;' : 'background-color: #00b894;'}
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2000);
}

export const eventApi = {
  getEvents: (): Promise<Event[]> => 
    apiClient.get('/events'),
  
  getEvent: (id: string): Promise<Event> => 
    apiClient.get(`/events/${id}`),
  
  createEvent: (data: Omit<Event, 'id' | 'currentVolunteers' | 'volunteers' | 'materials' | 'milestones' | 'isExpired' | 'createdAt'>): Promise<Event> => 
    apiClient.post('/events', data),
  
  signup: (id: string, volunteer: { name: string; phone: string }): Promise<Event> => 
    apiClient.post(`/events/${id}/signup`, volunteer),
};

export const materialApi = {
  getMaterials: (eventId?: string): Promise<Material[]> => 
    apiClient.get('/materials', { params: { eventId } }),
  
  createMaterial: (data: Omit<Material, 'id' | 'claimed'>): Promise<Material> => 
    apiClient.post('/materials', data),
  
  updateMaterial: (id: string, data: Partial<Material>): Promise<Material> => 
    apiClient.put(`/materials/${id}`, data),
  
  deleteMaterial: (id: string): Promise<void> => 
    apiClient.delete(`/materials/${id}`),
  
  claimMaterial: (id: string, data: { quantity: number; claimant: string }): Promise<Material> => 
    apiClient.post(`/materials/${id}/claim`, data),
  
  getClaims: (): Promise<MaterialClaim[]> => 
    apiClient.get('/material-claims'),
};

export default apiClient;
