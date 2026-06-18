import { Card } from '../types';

const BASE_URL = '/api/cards';

export const cardService = {
  async getCards(category?: string, search?: string): Promise<Card[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error('获取卡片列表失败');
    return response.json();
  },

  async getCard(id: string): Promise<Card> {
    const response = await fetch(`${BASE_URL}/${id}`);
    if (!response.ok) throw new Error('获取卡片详情失败');
    return response.json();
  },

  async createCard(card: Omit<Card, 'id' | 'createdAt'>): Promise<Card> {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    if (!response.ok) throw new Error('创建卡片失败');
    return response.json();
  },

  async updateCard(id: string, card: Partial<Card>): Promise<Card> {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    if (!response.ok) throw new Error('更新卡片失败');
    return response.json();
  },

  async deleteCard(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('删除卡片失败');
  },

  async getRelatedCards(id: string): Promise<Card[]> {
    const response = await fetch(`${BASE_URL}/${id}/related`);
    if (!response.ok) throw new Error('获取相关卡片失败');
    return response.json();
  }
};
