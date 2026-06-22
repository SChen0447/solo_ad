import type { Plant, Plan, GrowthRecord, Task } from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const plantApi = {
  list: () => request<Plant[]>('/plants'),
  get: (id: string) => request<Plant>(`/plants/${id}`),
  create: (data: Omit<Plant, 'id'>) =>
    request<Plant>('/plants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Plant>) =>
    request<Plant>(`/plants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/plants/${id}`, { method: 'DELETE' }),
};

export const planApi = {
  list: () => request<Plan[]>('/plans'),
  get: (id: string) => request<Plan & { plant: Plant }>(`/plans/${id}`),
  create: (data: Omit<Plan, 'id'>) =>
    request<Plan>('/plans', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/plans/${id}`, { method: 'DELETE' }),
};

export const recordApi = {
  list: (planId: string) => request<GrowthRecord[]>(`/plans/${planId}/records`),
  create: (planId: string, data: Omit<GrowthRecord, 'id' | 'planId'>) =>
    request<GrowthRecord>(`/plans/${planId}/records`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/records/${id}`, { method: 'DELETE' }),
};

export const taskApi = {
  getByDate: (date: string) => request<Task[]>(`/tasks/${date}`),
  complete: (taskKey: string) =>
    request<{ success: boolean }>(`/tasks/${taskKey}/complete`, { method: 'POST' }),
  uncomplete: (taskKey: string) =>
    request<{ success: boolean }>(`/tasks/${taskKey}/uncomplete`, { method: 'POST' }),
};
