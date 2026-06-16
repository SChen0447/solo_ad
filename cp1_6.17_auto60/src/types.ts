export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: number;
  name: string;
  prepTime: number;
  cookTime: number;
  ingredients: Ingredient[];
  steps: string[];
  coverUrl: string;
  tags: string[];
  description: string;
  dominantColor?: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export interface MealCell {
  day: DayOfWeek;
  slot: MealSlot;
  recipeId: number | null;
}

export interface ShoppingItem {
  name: string;
  amount: string;
  checked?: boolean;
}

export interface ShoppingGroups {
  [category: string]: ShoppingItem[];
}

export type Page = 'recipes' | 'planner';
