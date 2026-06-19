import { Plant, Log, LogsResponse, LogType } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const plantApi = {
  getAllPlants(): Promise<Plant[]> {
    return request<Plant[]>('/plants');
  },

  getPlant(id: string): Promise<Plant> {
    return request<Plant>(`/plants/${id}`);
  },

  createPlant(data: Omit<Plant, 'id' | 'createdAt' | 'nextWateringDate'>): Promise<Plant> {
    return request<Plant>('/plants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePlant(id: string, data: Partial<Plant>): Promise<Plant> {
    return request<Plant>(`/plants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePlant(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/plants/${id}`, {
      method: 'DELETE',
    });
  },

  getLogs(plantId?: string, skip: number = 0, limit: number = 20): Promise<LogsResponse> {
    const params = new URLSearchParams();
    if (plantId) params.append('plantId', plantId);
    params.append('skip', String(skip));
    params.append('limit', String(limit));
    return request<LogsResponse>(`/logs?${params.toString()}`);
  },

  createLog(data: { plantId: string; type: LogType; note: string }): Promise<Log> {
    return request<Log>('/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateLog(id: string, data: Partial<Log>): Promise<Log> {
    return request<Log>(`/logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteLog(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/logs/${id}`, {
      method: 'DELETE',
    });
  },
};
