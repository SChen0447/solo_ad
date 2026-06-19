export interface Asset {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  category: string;
  tags: string[];
  description: string;
  downloadCount: number;
  uploadedAt: string;
  url: string;
}

export interface CategoryGroup {
  name: string;
  tags: string[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getAssets(category?: string, tag?: string): Promise<Asset[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  const query = params.toString();
  const url = query ? `/api/assets?${query}` : '/api/assets';
  return request<Asset[]>(url);
}

export async function searchAssets(keyword: string): Promise<Asset[]> {
  return request<Asset[]>(`/api/search?q=${encodeURIComponent(keyword)}`);
}

export async function uploadAsset(
  file: File,
  category: string,
  tags: string[],
  description: string,
  onProgress?: (percent: number) => void
): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('tags', JSON.stringify(tags));
    formData.append('description', description);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('解析响应失败'));
        }
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
    xhr.addEventListener('abort', () => reject(new Error('上传已取消')));

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

export async function downloadAsset(id: string): Promise<void> {
  window.open(`/api/download/${id}`, '_blank');
}

export async function getCategories(): Promise<CategoryGroup[]> {
  return request<CategoryGroup[]>('/api/categories');
}
