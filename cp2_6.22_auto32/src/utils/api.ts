import type { Plant, PlantingPlan, GrowthRecord } from '@/types'

const BASE_URL = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE_URL + url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`)
  }
  return res.json()
}

export const plantApi = {
  getAll: () => request<Plant[]>('/plants'),
  get: (id: string) => request<Plant>(`/plants/${id}`),
  create: (data: Omit<Plant, 'id'>) =>
    request<Plant>('/plants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Plant>) =>
    request<Plant>(`/plants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) => request<{ success: boolean }>(`/plants/${id}`, { method: 'DELETE' }),
}

export const planApi = {
  getAll: () => request<PlantingPlan[]>('/plans'),
  get: (id: string) => request<PlantingPlan>(`/plans/${id}`),
  create: (data: Omit<PlantingPlan, 'id' | 'completedTasks'>) =>
    request<PlantingPlan>('/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<PlantingPlan>) =>
    request<PlantingPlan>(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  remove: (id: string) => request<{ success: boolean }>(`/plans/${id}`, { method: 'DELETE' }),
}

export const recordApi = {
  getAll: (planId?: string) =>
    request<GrowthRecord[]>(planId ? `/records?planId=${planId}` : '/records'),
  create: (data: Omit<GrowthRecord, 'id'>) =>
    request<GrowthRecord>('/records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  remove: (id: string) => request<{ success: boolean }>(`/records/${id}`, { method: 'DELETE' }),
}
