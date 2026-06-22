export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export interface RecipeStep {
  id: string;
  order: number;
  description: string;
  imageUrl?: string;
}

export interface Recipe {
  id: string;
  name: string;
  coverImage: string;
  description?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tags: string[];
  category: string;
  isPublic: boolean;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  completed: boolean;
}

export interface RecommendedRecipe {
  recipe: Recipe;
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: Ingredient[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  pantry?: Ingredient[];
  savedRecipes?: string[];
}
