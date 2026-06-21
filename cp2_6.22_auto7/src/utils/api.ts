export interface Exhibit {
  id: string;
  name: string;
  author: string;
  material: string;
  size: string;
  description: string;
  imageUrl: string;
  scanCount: number;
  likeCount: number;
  createdAt: string;
}

export interface HourlyStat {
  hour: number;
  scans: number;
  likes: number;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

export const api = {
  getExhibits: (): Promise<Exhibit[]> => request<Exhibit[]>('/exhibits'),

  getExhibit: (id: string): Promise<Exhibit> => request<Exhibit>(`/exhibits/${id}`),

  createExhibit: (data: Partial<Exhibit>): Promise<Exhibit> =>
    request<Exhibit>('/exhibits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateExhibit: (id: string, data: Partial<Exhibit>): Promise<Exhibit> =>
    request<Exhibit>(`/exhibits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteExhibit: (id: string): Promise<Exhibit> =>
    request<Exhibit>(`/exhibits/${id}`, { method: 'DELETE' }),

  interact: (
    exhibitId: string,
    type: 'scan' | 'like' | 'unlike'
  ): Promise<{ scanCount: number; likeCount: number }> =>
    request<{ scanCount: number; likeCount: number }>('/interact', {
      method: 'PUT',
      body: JSON.stringify({ exhibitId, type }),
    }),

  getStats: (exhibitId: string): Promise<HourlyStat[]> =>
    request<HourlyStat[]>(`/stats?exhibitId=${exhibitId}`),
};
