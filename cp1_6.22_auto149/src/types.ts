export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Author {
  id: string;
  name: string;
  avatar: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cover: string;
  author: Author;
  rating: number;
  reviewCount: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
  baseServings: number;
  basePanSize: number;
  createdAt: number;
  favorited?: boolean;
}

export interface Review {
  id: string;
  recipeId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  content: string;
  createdAt: number;
}
