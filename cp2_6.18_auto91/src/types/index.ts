export type Category = 'frontend' | 'backend' | 'tool' | 'pitfall';

export interface Card {
  id: string;
  title: string;
  category: Category;
  content: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  cardId: string;
  createdAt: string;
}

export const CATEGORY_CONFIG: Record<Category, { label: string; color: string }> = {
  frontend: { label: '前端', color: '#3b82f6' },
  backend: { label: '后端', color: '#22c55e' },
  tool: { label: '工具', color: '#f97316' },
  pitfall: { label: '踩坑', color: '#ef4444' }
};
