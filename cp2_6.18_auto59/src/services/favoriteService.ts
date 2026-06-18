import { Card } from '../types';

const BASE_URL = '/api/favorites';

export const favoriteService = {
  async getFavorites(): Promise<Card[]> {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error('Failed to fetch favorites');
    return res.json();
  },

  async addFavorite(cardId: string): Promise<{ favorited: boolean }> {
    const res = await fetch(`${BASE_URL}/${cardId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to add favorite');
    return res.json();
  },

  async removeFavorite(cardId: string): Promise<{ favorited: boolean }> {
    const res = await fetch(`${BASE_URL}/${cardId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove favorite');
    return res.json();
  }
};
