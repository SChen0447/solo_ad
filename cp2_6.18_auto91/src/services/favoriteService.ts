import type { Favorite } from '../types';

const BASE_URL = '/api/favorites';

export async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

export async function addFavorite(cardId: string): Promise<Favorite> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId })
  });
  if (!res.ok) throw new Error('Failed to add favorite');
  return res.json();
}

export async function removeFavorite(cardId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/${cardId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to remove favorite');
  return res.json();
}
