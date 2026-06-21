export interface Material {
  id: number;
  file_path: string;
  thumbnail_path: string | null;
  file_name: string;
  created_at: string;
  tags: string[];
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

const API_BASE = '/api/materials';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const materialApi = {
  async getAll(filters?: { tag?: string; sort?: 'asc' | 'desc' }): Promise<Material[]> {
    const params = new URLSearchParams();
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.sort) params.set('sort', filters.sort);
    const qs = params.toString();
    return request<Material[]>(`${API_BASE}${qs ? `?${qs}` : ''}`);
  },

  async getAllTags(): Promise<string[]> {
    return request<string[]>(`${API_BASE}/tags`);
  },

  async upload(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Material> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('image', file);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percent: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || '上传失败'));
          } catch {
            reject(new Error('上传失败'));
          }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('网络错误')));
      xhr.addEventListener('abort', () => reject(new Error('已取消')));

      xhr.open('POST', `${API_BASE}/upload`);
      xhr.send(formData);
    });
  },

  async setTags(id: number, tags: string[]): Promise<Material> {
    return request<Material>(`${API_BASE}/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
  },
};
