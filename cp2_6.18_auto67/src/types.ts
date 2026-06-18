export interface Card {
  id: string;
  title: string;
  category: string;
  content: string;
  difficulty: number;
  createdAt: string;
}

export type CategoryType = 'all' | '前端' | '后端' | '工具' | '踩坑';

export const CATEGORIES: CategoryType[] = ['all', '前端', '后端', '工具', '踩坑'];

export const CATEGORY_COLORS: Record<string, string> = {
  '前端': '#3b82f6',
  '后端': '#22c55e',
  '工具': '#f97316',
  '踩坑': '#ef4444'
};
