export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  order: number;
  description: string;
  image?: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  image?: string;
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: number;
  averageRating: number;
  ratingCount: number;
  heat: number;
}

export interface Comment {
  id: string;
  recipeId: string;
  nickname: string;
  content: string;
  createdAt: number;
}
