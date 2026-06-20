import { Plant, Post, CareRecord, User, Comment } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
}

export async function getPlants(): Promise<Plant[]> {
  return request<Plant[]>('/api/plants');
}

export async function addPlant(data: Partial<Plant>): Promise<Plant> {
  return request<Plant>('/api/plants', { method: 'POST', body: JSON.stringify(data) });
}

export async function waterPlant(id: string): Promise<Plant> {
  return request<Plant>(`/api/plants/${id}/water`, { method: 'POST' });
}

export async function fertilizePlant(id: string): Promise<CareRecord> {
  return request<CareRecord>(`/api/plants/${id}/fertilize`, { method: 'POST' });
}

export async function repotPlant(id: string): Promise<CareRecord> {
  return request<CareRecord>(`/api/plants/${id}/repot`, { method: 'POST' });
}

export async function getCareRecords(plantId: string): Promise<CareRecord[]> {
  return request<CareRecord[]>(`/api/plants/${plantId}/care-records`);
}

export async function getPosts(): Promise<Post[]> {
  return request<Post[]>('/api/posts');
}

export async function addPost(data: { author: string; avatar: string; content: string }): Promise<Post> {
  return request<Post>('/api/posts', { method: 'POST', body: JSON.stringify(data) });
}

export async function likePost(id: string): Promise<Post> {
  return request<Post>(`/api/posts/${id}/like`, { method: 'POST' });
}

export async function savePost(id: string): Promise<Post> {
  return request<Post>(`/api/posts/${id}/save`, { method: 'POST' });
}

export async function addComment(postId: string, data: { author: string; avatar: string; content: string }): Promise<Comment> {
  return request<Comment>(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getUser(): Promise<User> {
  return request<User>('/api/user');
}
