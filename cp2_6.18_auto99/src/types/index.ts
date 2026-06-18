export type Category = '前端' | '后端' | '工具' | '踩坑';

export interface Card {
  id: string;
  title: string;
  category: Category;
  content: string;
  difficulty: number;
  favorited: boolean;
  createdAt: string;
}

export interface CardInput {
  title: string;
  category: Category;
  content: string;
  difficulty: number;
}

export const CATEGORIES: Category[] = ['前端', '后端', '工具', '踩坑'];

export const CATEGORY_COLORS: Record<Category, string> = {
  '前端': '#3b82f6',
  '后端': '#22c55e',
  '工具': '#f97316',
  '踩坑': '#ef4444'
};
