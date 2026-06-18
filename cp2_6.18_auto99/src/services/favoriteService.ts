import { Card } from '../types';

const API_BASE = '/api/favorites';

export const getFavorites = async (): Promise<Card[]> => {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
};

export const addFavorite = async (cardId: string): Promise<{ cardId: string; favorited: boolean }> => {
  const res = await fetch(`${API_BASE}/${cardId}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to add favorite');
  return res.json();
};

export const removeFavorite = async (cardId: string): Promise<{ cardId: string; favorited: boolean }> => {
  const res = await fetch(`${API_BASE}/${cardId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to remove favorite');
  return res.json();
};

export const toggleFavorite = async (cardId: string): Promise<{ cardId: string; favorited: boolean }> => {
  const res = await fetch(`${API_BASE}/${cardId}/toggle`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
};
