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
  hour: string;
  total: number;
}

export interface InteractionResult {
  scanCount: number;
  likeCount: number;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('网络错误，请稍后重试');
  }
}

export function getExhibits(): Promise<Exhibit[]> {
  return request<Exhibit[]>('/exhibits');
}

export function createExhibit(data: Partial<Exhibit>): Promise<Exhibit> {
  return request<Exhibit>('/exhibits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateExhibit(id: string, data: Partial<Exhibit>): Promise<Exhibit> {
  return request<Exhibit>(`/exhibits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteExhibit(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/exhibits/${id}`, {
    method: 'DELETE',
  });
}

export function interact(
  exhibitId: string,
  type: 'scan' | 'like' | 'unlike'
): Promise<InteractionResult> {
  return request<InteractionResult>('/interact', {
    method: 'PUT',
    body: JSON.stringify({ exhibitId, type }),
  });
}

export function getStats(exhibitId?: string): Promise<HourlyStat[]> {
  const url = exhibitId ? `/stats?exhibitId=${encodeURIComponent(exhibitId)}` : '/stats';
  return request<HourlyStat[]>(url);
}
