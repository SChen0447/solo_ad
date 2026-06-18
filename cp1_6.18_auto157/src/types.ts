export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  purchased?: boolean;
}

export interface RecipeStep {
  id: string;
  order: number;
  description: string;
  completed?: boolean;
}

export interface Rating {
  userId: string;
  stars: number;
  comment: string;
  createdAt: number;
}

export interface Recipe {
  id: string;
  name: string;
  imageUrl: string;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine: '中餐' | '西餐' | '日料' | '韩餐' | '东南亚' | '其他';
  ingredients: Ingredient[];
  steps: RecipeStep[];
  ratings: Rating[];
  createdAt: number;
}

export interface FridgeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  usedUp: boolean;
}

export type CuisineFilter = Recipe['cuisine'] | '全部';
export type TimeFilter = '全部' | '15分钟内' | '30分钟内' | '1小时内';

export interface RecommendedRecipe {
  recipe: Recipe;
  coverage: number;
}

export const DIFFICULTY_LABELS: Record<Recipe['difficulty'], string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const CUISINE_OPTIONS: Recipe['cuisine'][] = ['中餐', '西餐', '日料', '韩餐', '东南亚', '其他'];

export const TIME_FILTERS: TimeFilter[] = ['全部', '15分钟内', '30分钟内', '1小时内'];
