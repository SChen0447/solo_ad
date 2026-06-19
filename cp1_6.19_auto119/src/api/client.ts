import type { User, Book, Swap, PointsTransaction } from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const fetchUsers = () => request<User[]>('/users');
export const fetchUser = (id: string) => request<User>(`/users/${id}`);
export const fetchLeaderboard = () => request<User[]>('/users/leaderboard');

export const fetchBooks = (search?: string, ownerId?: string) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (ownerId) params.set('ownerId', ownerId);
  const qs = params.toString();
  return request<Book[]>(`/books${qs ? `?${qs}` : ''}`);
};
export const fetchBook = (id: string) => request<Book>(`/books/${id}`);
export const createBook = (book: Omit<Book, 'id' | 'createdAt'>) =>
  request<Book>('/books', { method: 'POST', body: JSON.stringify(book) });
export const deleteBook = (id: string) =>
  request<void>(`/books/${id}`, { method: 'DELETE' });

export const fetchSwaps = (userId?: string, status?: string) => {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (status) params.set('status', status);
  const qs = params.toString();
  return request<Swap[]>(`/swaps${qs ? `?${qs}` : ''}`);
};
export const fetchSwap = (id: string) => request<Swap>(`/swaps/${id}`);
export const createSwap = (data: { requesterId: string; bookOfferedId: string; bookRequestedId: string }) =>
  request<Swap>('/swaps', { method: 'POST', body: JSON.stringify(data) });
export const acceptSwap = (id: string) =>
  request<Swap>(`/swaps/${id}/accept`, { method: 'PUT' });
export const rejectSwap = (id: string) =>
  request<Swap>(`/swaps/${id}/reject`, { method: 'PUT' });
export const completeSwap = (id: string) =>
  request<Swap>(`/swaps/${id}/complete`, { method: 'PUT' });

export const fetchPoints = (userId: string) =>
  request<PointsTransaction[]>(`/points/${userId}`);
export const addPoints = (userId: string, points: number) =>
  request<PointsTransaction>(`/points/${userId}/add`, { method: 'POST', body: JSON.stringify({ points }) });
