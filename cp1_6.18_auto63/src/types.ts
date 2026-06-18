export interface Photo {
  id: string;
  url: string;
  title: string;
  category: Category;
  description: string;
}

export type Category = '风景' | '人像' | '建筑' | '动物' | '自然';

export const CATEGORY_COLORS: Record<Category, string> = {
  '风景': '#3498db',
  '人像': '#e74c3c',
  '建筑': '#f39c12',
  '动物': '#2ecc71',
  '自然': '#9b59b6',
};

export const ALL_CATEGORIES: Category[] = ['风景', '人像', '建筑', '动物', '自然'];
