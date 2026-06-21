export interface WordItem {
  text: string;
  count: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  width: number;
  height: number;
}

export interface WordCloudData {
  words: WordItem[];
  width: number;
  height: number;
  imageDataUrl: string;
}

export interface Capsule {
  id: string;
  text: string;
  tags: string[];
  imageDataUrl: string;
  timestamp: string;
}

export interface CapsuleCreate {
  text: string;
  tags: string[];
  imageDataUrl: string;
  timestamp: string;
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status}`);
  }
  return res.json();
}

export function generateWordCloud(text: string): Promise<WordCloudData> {
  return request<WordCloudData>('/wordcloud', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function getCapsules(): Promise<Capsule[]> {
  return request<Capsule[]>('/capsules');
}

export function saveCapsule(capsule: CapsuleCreate): Promise<Capsule> {
  return request<Capsule>('/capsules', {
    method: 'POST',
    body: JSON.stringify(capsule),
  });
}

export function deleteCapsule(id: string): Promise<void> {
  return request<void>(`/capsules/${id}`, {
    method: 'DELETE',
  });
}
