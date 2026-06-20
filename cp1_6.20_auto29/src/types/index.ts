export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  steps: string;
  estimatedTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  name: string;
  totalQuantity: number;
  unit: string;
  category: string;
  recipes: string[];
  isHighlighted?: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  cursor?: {
    recipeId: string;
    position: number;
  };
  selection?: {
    recipeId: string;
    start: number;
    end: number;
  };
  color: string;
}

export type ActivityLogType = 'recipe_add' | 'recipe_edit' | 'recipe_delete' | 'ingredient_edit' | 'shopping_export';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: string;
  timestamp: string;
  type: ActivityLogType;
}

export interface OptimizationResult {
  before: ShoppingItem[];
  after: ShoppingItem[];
  savedItems: {
    name: string;
    saved: number;
  }[];
}

export interface Project {
  id: string;
  name: string;
  recipes: Recipe[];
  logs: ActivityLog[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export type CategoryType = '蔬菜' | '肉类' | '调味料' | '海鲜' | '主食' | '蛋奶' | '其他';

export const CATEGORIES: CategoryType[] = ['蔬菜', '肉类', '调味料', '海鲜', '主食', '蛋奶', '其他'];

export const UNITS = ['个', '克', '千克', '毫升', '升', '勺', '茶匙', '杯', '把', '小块'];

export const COLLABORATOR_COLORS = [
  '#F4A460',
  '#6B8E23',
  '#4A90D9',
  '#E74C3C',
  '#9B59B6',
  '#1ABC9C',
  '#F39C12',
  '#34495E'
];
