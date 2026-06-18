import type { Card, Category } from '../types';

const BASE_URL = '/api/cards';

export async function getCards(): Promise<Card[]> {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function getCard(id: string): Promise<Card> {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch card');
  return res.json();
}

export async function createCard(data: {
  title: string;
  category: Category;
  content: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}): Promise<Card> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create card');
  return res.json();
}

export async function updateCard(
  id: string,
  data: Partial<Omit<Card, 'id' | 'createdAt'>>
): Promise<Card> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
}

export async function deleteCard(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete card');
  return res.json();
}
