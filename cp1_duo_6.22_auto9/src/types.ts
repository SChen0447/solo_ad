export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  substitute: string;
  category: IngredientCategory;
}

export type IngredientCategory =
  | 'vegetable'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'grain'
  | 'seasoning'
  | 'fruit'
  | 'other';

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  vegetable: '蔬菜类',
  meat: '肉类',
  seafood: '海鲜类',
  dairy: '乳制品',
  grain: '谷物主食',
  seasoning: '调料',
  fruit: '水果',
  other: '其他',
};

export const CATEGORY_ORDER: IngredientCategory[] = [
  'vegetable',
  'meat',
  'seafood',
  'dairy',
  'grain',
  'seasoning',
  'fruit',
  'other',
];

export interface Step {
  id: string;
  description: string;
  imageUrl: string | null;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: number;
  updatedAt: number;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  title: string;
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: number;
  note: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: IngredientCategory;
  checked: boolean;
  isCustom: boolean;
}

export type PageView = 'list' | 'editor' | 'shopping' | 'versions';
