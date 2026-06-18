export type Difficulty = '简单' | '中等' | '困难';

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  cookTime: number;
  difficulty: Difficulty;
  coverImage: string;
  ingredients: Ingredient[];
  steps: string[];
  scaleFactor: number;
  selected: boolean;
}

export interface ShoppingItem {
  name: string;
  amount: number;
  unit: string;
  category: string;
  completed: boolean;
}

export interface ShoppingGroup {
  category: string;
  items: ShoppingItem[];
  collapsed: boolean;
}

export type TabType = 'recipes' | 'shopping';
