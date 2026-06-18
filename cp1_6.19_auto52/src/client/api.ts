import type { Card, Comment } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('网络请求失败');
  }
}

export async function fetchCards(): Promise<Card[]> {
  return request<Card[]>('/cards');
}

export async function createCard(title: string, content: string): Promise<Card> {
  return request<Card>('/cards', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  });
}

export async function voteCard(cardId: string): Promise<{ votes: number }> {
  return request<{ votes: number }>(`/cards/${cardId}/vote`, {
    method: 'POST',
  });
}

export async function addComment(cardId: string, content: string): Promise<Comment> {
  return request<Comment>(`/cards/${cardId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
