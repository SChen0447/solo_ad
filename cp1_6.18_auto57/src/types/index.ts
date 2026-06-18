export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
}

export interface Recipe {
  id: string;
  title: string;
  imageUrl?: string;
  ingredients: Ingredient[];
  steps: string;
  createdAt: number;
  favorite: boolean;
}

export interface CreateRecipeRequest {
  title: string;
  imageUrl?: string;
  ingredients: Ingredient[];
  steps: string;
}

export interface NutritionTotal {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface ToastMessage {
  id: string;
  text: string;
}
