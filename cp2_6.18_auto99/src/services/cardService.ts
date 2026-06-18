import { Card, CardInput } from '../types';

const API_BASE = '/api/cards';

export const getCards = async (category?: string, keyword?: string): Promise<Card[]> => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (keyword) params.append('keyword', keyword);

  const url = params.toString() ? `${API_BASE}?${params.toString()}` : API_BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
};

export const getCard = async (id: string): Promise<Card> => {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch card');
  return res.json();
};

export const createCard = async (data: CardInput): Promise<Card> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create card');
  return res.json();
};

export const updateCard = async (id: string, data: Partial<CardInput>): Promise<Card> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
};

export const deleteCard = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete card');
};

export const getRecommendations = async (id: string): Promise<Card[]> => {
  const res = await fetch(`${API_BASE}/${id}/recommendations`);
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
};
