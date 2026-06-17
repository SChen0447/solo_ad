import type { User, CardsResponse } from '../types';

const API_BASE = '/api';
const TIMEOUT = 10000;

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `请求失败: ${response.status}`);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请稍后重试');
      }
      throw error;
    }
    throw new Error('网络请求失败');
  }
}

export function register(username: string, password: string): Promise<User> {
  return request<User>('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string): Promise<User> {
  return request<User>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function getProfile(userId: string): Promise<User> {
  return request<User>(`/profile/${userId}`);
}

export function updateProfile(
  userId: string,
  profile: Partial<Omit<User, 'id' | 'username'>>
): Promise<User> {
  return request<User>('/profile', {
    method: 'PUT',
    body: JSON.stringify({ userId, ...profile }),
  });
}

export function getCards(params: {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
}): Promise<CardsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('userId', params.userId);
  if (params.page !== undefined) queryParams.append('page', String(params.page));
  if (params.pageSize !== undefined) queryParams.append('pageSize', String(params.pageSize));
  if (params.search) queryParams.append('search', params.search);
  if (params.sort) queryParams.append('sort', params.sort);

  return request<CardsResponse>(`/cards?${queryParams.toString()}`);
}

export function addExchange(fromUserId: string, toUserId: string): Promise<{ message: string }> {
  return request<{ message: string }>('/exchange', {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId }),
  });
}

export function deleteCard(userId: string, cardId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/cards/${cardId}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

export function updateCardNote(
  userId: string,
  cardId: string,
  note: string
): Promise<{ message: string; note: string }> {
  return request<{ message: string; note: string }>(`/cards/${cardId}/note`, {
    method: 'PUT',
    body: JSON.stringify({ userId, note }),
  });
}
