export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  cookingTime: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  isFavorite: boolean;
}
