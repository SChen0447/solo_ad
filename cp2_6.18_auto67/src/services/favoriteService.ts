import { Card } from '../types';

const BASE_URL = '/api/favorites';

export const favoriteService = {
  async getFavorites(): Promise<Card[]> {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error('获取收藏列表失败');
    return response.json();
  },

  async addFavorite(cardId: string): Promise<Card> {
    const response = await fetch(`${BASE_URL}/${cardId}`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('添加收藏失败');
    const data = await response.json();
    return data.card;
  },

  async removeFavorite(cardId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${cardId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('取消收藏失败');
  },

  async checkFavorite(cardId: string): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/check/${cardId}`);
    if (!response.ok) throw new Error('检查收藏状态失败');
    const data = await response.json();
    return data.isFavorite;
  }
};
