export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  stock: number;
  description: string;
  category: string;
  cover_image: string;
}

export interface CartItem {
  book_id: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
  category: string;
  cover_image: string;
}

export type CategoryType = '小说' | '科技' | '艺术';

export const CATEGORIES: CategoryType[] = ['小说', '科技', '艺术'];

export const CATEGORY_COLORS: Record<CategoryType, string[]> = {
  '小说': ['#c17025', '#e8945a', '#d4684a', '#b85c38', '#e07850'],
  '科技': ['#3a7bd5', '#5a9fd4', '#4a6fa5', '#3d5a80', '#6699cc'],
  '艺术': ['#ff6b9d', '#c06c84', '#6c5b7b', '#355c7d', '#f8b195'],
};
