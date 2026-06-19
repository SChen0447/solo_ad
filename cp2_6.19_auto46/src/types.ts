export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: number;
  name: string;
  emoji: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
}

export interface RecommendedRecipe extends Recipe {
  matchScore: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

export interface RecipesResponse {
  recipes: Recipe[];
  allIngredients: string[];
}

export interface RecommendResponse {
  recommendations: RecommendedRecipe[];
}
