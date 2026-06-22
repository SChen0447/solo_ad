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
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  pantry: Ingredient[];
  shoppingList: ShoppingListItem[];
  savedRecipes: string[];
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
