export interface User {
  id: string;
  username: string;
  avatar: string;
  createdAt: number;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  image: string;
  artistId: string;
  artistName: string;
  createdAt: number;
  duration: number;
  ended: boolean;
  winnerId: string | null;
  winnerName: string | null;
}

export interface Bid {
  id: string;
  itemId: string;
  userId: string;
  username: string;
  amount: number;
  createdAt: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const BASE_URL = '/api';

const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data as T;
};

export const api = {
  register: (username: string, password: string) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getItems: (page = 1, limit = 20) =>
    request<PaginatedResponse<Item>>(`/items?page=${page}&limit=${limit}`),

  getItem: (id: string) => request<Item>(`/items/${id}`),

  createItem: (data: {
    title: string;
    description: string;
    startingPrice: number;
    image: string;
    artistId: string;
    artistName: string;
  }) =>
    request<Item>('/items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getBids: (itemId: string) => request<Bid[]>(`/items/${itemId}/bids`),

  createBid: (itemId: string, data: { userId: string; username: string; amount: number }) =>
    request<Bid>(`/items/${itemId}/bids`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
