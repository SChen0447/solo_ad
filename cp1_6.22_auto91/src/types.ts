export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  text: string;
  image?: string;
}

export interface Recipe {
  id: string;
  title: string;
  coverImage: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  recipeId: string;
  username: string;
  avatarColor: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface RecipeFormData {
  title: string;
  coverImage: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  author: string;
}
