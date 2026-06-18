import { Card } from '../types';

const BASE_URL = '/api/cards';

export const cardService = {
  async getCards(category?: string, keyword?: string): Promise<Card[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (keyword) params.set('keyword', keyword);
    const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch cards');
    return res.json();
  },

  async getCard(id: string): Promise<Card> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error('Failed to fetch card');
    return res.json();
  },

  async createCard(data: Omit<Card, 'id' | 'createdAt'>): Promise<Card> {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create card');
    return res.json();
  },

  async updateCard(id: string, data: Partial<Card>): Promise<Card> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update card');
    return res.json();
  },

  async deleteCard(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete card');
  }
};
